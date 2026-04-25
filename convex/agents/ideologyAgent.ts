"use node";

// phase 4 (MAAS): IDEOLOGY AGENT. Parameterized by a host record. Reads a
// source article, returns that host's ideological stance — what they'd
// emphasize, where they'd push back. Composer consumes the stances of both
// hosts to write the dialogue. One ideology agent runs PER selected host,
// spawned dynamically by the manager (this is the L4 dynamic-delegation hook).

import Anthropic from "@anthropic-ai/sdk";
import { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { withTrace, estimateClaudeCost } from "./lib/runLog";

const PROMPT_VERSION = "ideology-v1-2026-04-25";
const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1024;

export type IdeologyStance = {
  hostName: string;
  slot: "KALAM" | "ANCHOR";
  stance: string; // 1-2 sentence overall position
  keyArguments: string[]; // 2-4 bullets this host emphasizes
  mustPushBackOn: string[]; // points the OTHER host might raise that this host counters
  toneNotes: string; // delivery cadence guidance for composer
};

function buildPrompt(host: Doc<"hosts">, sourceTitle: string, sourceText: string): string {
  return `You are an ideology research agent for a podcast script.

You are NOT writing dialogue. You are producing the STANCE that one host (${host.name}) would take on the article below, so a downstream composer can write a balanced two-host debate.

# Your host
Name: ${host.name}
Slot: ${host.slot}
Persona: ${host.persona}
Ideology / lens:
${host.ideologyPrompt}

# Output format (strict JSON, no prose, no fences)

{
  "stance": "1-2 sentences capturing this host's overall position on the article",
  "keyArguments": ["3 to 4 short bullets, each a specific point this host would emphasize"],
  "mustPushBackOn": ["2 to 3 short bullets — angles where this host would disagree with a generic take"],
  "toneNotes": "1 sentence of delivery guidance: pace, register, signature phrasing"
}

# Rules
- Output JSON only. No markdown fences, no commentary.
- Ground every argument in the article. No invented facts.
- Be specific. "AI is important" is bad; "the H100 supply ramp matters because..." is good.
- Stay in this host's voice — don't smuggle in the other host's perspective.

# Source article
Title: ${sourceTitle}

${sourceText}`;
}

function stripFences(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1].trim() : t;
}

function validateStance(raw: unknown): {
  stance: string;
  keyArguments: string[];
  mustPushBackOn: string[];
  toneNotes: string;
} {
  if (!raw || typeof raw !== "object") throw new Error("not an object");
  const r = raw as Record<string, unknown>;
  const stance = r.stance;
  const keyArgs = r.keyArguments;
  const pushBack = r.mustPushBackOn;
  const tone = r.toneNotes;
  if (typeof stance !== "string" || !stance.trim())
    throw new Error("stance must be non-empty string");
  if (!Array.isArray(keyArgs) || keyArgs.length === 0)
    throw new Error("keyArguments must be non-empty array");
  if (!Array.isArray(pushBack) || pushBack.length === 0)
    throw new Error("mustPushBackOn must be non-empty array");
  if (typeof tone !== "string" || !tone.trim())
    throw new Error("toneNotes must be non-empty string");
  for (const a of keyArgs) {
    if (typeof a !== "string" || !a.trim())
      throw new Error("keyArguments entries must be non-empty strings");
  }
  for (const a of pushBack) {
    if (typeof a !== "string" || !a.trim())
      throw new Error("mustPushBackOn entries must be non-empty strings");
  }
  return {
    stance: stance.trim(),
    keyArguments: keyArgs as string[],
    mustPushBackOn: pushBack as string[],
    toneNotes: tone.trim(),
  };
}

export async function doIdeology(
  ctx: ActionCtx,
  params: {
    sourceId: Id<"sources">;
    userTokenId: string;
    hostId: Id<"hosts">;
    parentRunId?: Id<"generationRuns">;
  },
): Promise<IdeologyStance> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set on convex deployment");

  const source = await ctx.runQuery(internal.sources.getOwnedInternal, {
    sourceId: params.sourceId,
    userTokenId: params.userTokenId,
  });

  const host = await ctx.runQuery(internal.hosts.getOwnedOrGlobalInternal, {
    hostId: params.hostId,
    userTokenId: params.userTokenId,
  });
  if (!host) throw new Error(`host not found: ${params.hostId}`);

  const { output } = await withTrace(
    ctx,
    {
      userTokenId: params.userTokenId,
      sourceId: params.sourceId,
      parentRunId: params.parentRunId,
      step: "ideology",
      agentName: `ideology-${host.slot.toLowerCase()}-${host.name}`,
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      input: { hostId: params.hostId, hostName: host.name, sourceId: params.sourceId },
    },
    async () => {
      const prompt = buildPrompt(host, source.title, source.rawText);
      const client = new Anthropic({ apiKey });
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      });
      const text = resp.content.find((b) => b.type === "text");
      if (!text || text.type !== "text") throw new Error("no text block in response");
      const parsed = JSON.parse(stripFences(text.text));
      const validated = validateStance(parsed);
      const stance: IdeologyStance = {
        hostName: host.name,
        slot: host.slot,
        ...validated,
      };
      const tokensIn = resp.usage?.input_tokens ?? 0;
      const tokensOut = resp.usage?.output_tokens ?? 0;
      return {
        output: stance,
        tokensIn,
        tokensOut,
        costUsd: estimateClaudeCost(MODEL, tokensIn, tokensOut),
      };
    },
  );

  return output.output as IdeologyStance;
}
