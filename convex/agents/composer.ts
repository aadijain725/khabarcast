"use node";

// phase 4 (MAAS): COMPOSER agent. Sub-team manager — spawns one ideology
// agent per host slot in PARALLEL, then weaves a balanced two-host dialogue
// from their stances + the source article. Output JSON matches the existing
// dialogueValidator (KALAM/ANCHOR speaker literals stay; persona is dynamic
// via host record).

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { ActionCtx, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { withTrace, estimateClaudeCost } from "./lib/runLog";
import { doIdeology, IdeologyStance } from "./ideologyAgent";

const PROMPT_VERSION = "composer-v1-2026-04-25";
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;

type Dialogue = {
  episode_title: string;
  source_title: string;
  topics: Array<{
    title: string;
    subtopics: Array<{
      label:
        | "core facts"
        | "why it matters"
        | "challenge"
        | "constructive takeaway";
      turns: Array<{ speaker: "KALAM" | "ANCHOR"; text: string }>;
    }>;
  }>;
};

const REQUIRED_LABELS: Array<Dialogue["topics"][number]["subtopics"][number]["label"]> = [
  "core facts",
  "why it matters",
  "challenge",
  "constructive takeaway",
];

function stripFences(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1].trim() : t;
}

function validateDialogue(raw: unknown): Dialogue {
  if (!raw || typeof raw !== "object") throw new Error("not an object");
  const d = raw as Record<string, unknown>;
  if (typeof d.episode_title !== "string") throw new Error("missing episode_title");
  if (typeof d.source_title !== "string") throw new Error("missing source_title");
  if (!Array.isArray(d.topics) || d.topics.length === 0)
    throw new Error("topics must be non-empty array");
  for (const t of d.topics) {
    if (!t || typeof t !== "object") throw new Error("topic not object");
    const tt = t as Record<string, unknown>;
    if (typeof tt.title !== "string") throw new Error("topic.title missing");
    if (!Array.isArray(tt.subtopics) || tt.subtopics.length !== 4)
      throw new Error("each topic needs exactly 4 subtopics");
    tt.subtopics.forEach((st: unknown, i: number) => {
      if (!st || typeof st !== "object") throw new Error("subtopic not object");
      const s = st as Record<string, unknown>;
      if (s.label !== REQUIRED_LABELS[i])
        throw new Error(`subtopic[${i}].label must be "${REQUIRED_LABELS[i]}"`);
      if (!Array.isArray(s.turns) || s.turns.length === 0)
        throw new Error("turns must be non-empty array");
      for (const turn of s.turns) {
        if (!turn || typeof turn !== "object") throw new Error("turn not object");
        const tu = turn as Record<string, unknown>;
        if (tu.speaker !== "KALAM" && tu.speaker !== "ANCHOR")
          throw new Error('speaker must be "KALAM" or "ANCHOR"');
        if (typeof tu.text !== "string" || !tu.text.trim())
          throw new Error("turn.text must be non-empty string");
      }
    });
  }
  return raw as Dialogue;
}

function renderStance(slot: "KALAM" | "ANCHOR", stance: IdeologyStance): string {
  return `## ${slot} (filled by: ${stance.hostName})
Stance: ${stance.stance}
Key arguments:
${stance.keyArguments.map((a) => "  - " + a).join("\n")}
Must push back on:
${stance.mustPushBackOn.map((a) => "  - " + a).join("\n")}
Tone: ${stance.toneNotes}`;
}

function buildPrompt(
  kalam: Doc<"hosts">,
  anchor: Doc<"hosts">,
  kalamStance: IdeologyStance,
  anchorStance: IdeologyStance,
  sourceTitle: string,
  sourceText: string,
): string {
  return `You are composing a two-host podcast dialogue. The hosts have already done their own research — your job is to weave their stances into a tight 3-5 minute debate. Output valid JSON only — no prose before or after.

# Slot KALAM
Host: ${kalam.name}
Persona: ${kalam.persona}
Ideology / lens:
${kalam.ideologyPrompt}

# Slot ANCHOR
Host: ${anchor.name}
Persona: ${anchor.persona}
Ideology / lens:
${anchor.ideologyPrompt}

# Pre-research (use these stances as primary content; do not invent new positions)

${renderStance("KALAM", kalamStance)}

${renderStance("ANCHOR", anchorStance)}

# Topic structure
Pick exactly 2 topics from the article (3 only if article is 2000+ words).
Name each topic in ≤ 5 words.
Order topics: FACT → CHALLENGE → SYNTHESIS.
Inside each topic, use 4 subtopics in this fixed order:
  1. "core facts"           — what happened, plainly
  2. "why it matters"       — stakes, who's affected
  3. "challenge"            — ANCHOR pushes hard, real counter-argument
  4. "constructive takeaway" — KALAM synthesizes a forward-looking insight

# Length
3–5 minutes of spoken dialogue total. ~500–800 words. Keep turns short
(1–3 sentences). Natural rhythm — don't monologue.

# Schema

{
  "episode_title": "≤ 8 words, punchy",
  "source_title": "title of the article",
  "topics": [
    {
      "title": "≤ 5 words",
      "subtopics": [
        {
          "label": "core facts" | "why it matters" | "challenge" | "constructive takeaway",
          "turns": [
            { "speaker": "KALAM" | "ANCHOR", "text": "1-3 sentences" }
          ]
        }
      ]
    }
  ]
}

# Rules
- Output JSON only. No commentary, no markdown fences, no explanation.
- Every topic must have exactly 4 subtopics in the order above.
- The "challenge" subtopic must contain at least one ANCHOR turn that
  explicitly disagrees or surfaces a real downside drawn from the
  ANCHOR pre-research.
- KALAM's takeaway must echo a key argument from the KALAM pre-research.
- Don't invent facts not in the source. If the article is thin on a topic,
  pick a different topic.

# Source article

Title: ${sourceTitle}

${sourceText}`;
}

export async function doCompose(
  ctx: ActionCtx,
  params: {
    sourceId: Id<"sources">;
    userTokenId: string;
    hostMapping: { KALAM: Id<"hosts">; ANCHOR: Id<"hosts"> };
    parentRunId?: Id<"generationRuns">;
  },
): Promise<{ episodeId: Id<"episodes">; runId: Id<"generationRuns"> }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set on convex deployment");

  const source = await ctx.runQuery(internal.sources.getOwnedInternal, {
    sourceId: params.sourceId,
    userTokenId: params.userTokenId,
  });

  const [kalam, anchor] = await Promise.all([
    ctx.runQuery(internal.hosts.getOwnedOrGlobalInternal, {
      hostId: params.hostMapping.KALAM,
      userTokenId: params.userTokenId,
    }),
    ctx.runQuery(internal.hosts.getOwnedOrGlobalInternal, {
      hostId: params.hostMapping.ANCHOR,
      userTokenId: params.userTokenId,
    }),
  ]);
  if (kalam.slot !== "KALAM") throw new Error(`host ${kalam.name} is not in KALAM slot`);
  if (anchor.slot !== "ANCHOR") throw new Error(`host ${anchor.name} is not in ANCHOR slot`);

  const { runId, output } = await withTrace(
    ctx,
    {
      userTokenId: params.userTokenId,
      sourceId: params.sourceId,
      parentRunId: params.parentRunId,
      step: "composer",
      agentName: `composer:${kalam.name}+${anchor.name}`,
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      input: {
        sourceId: params.sourceId,
        kalam: kalam.name,
        anchor: anchor.name,
      },
    },
    async (composerRunId) => {
      // Spawn 2 ideology agents in parallel as children of the composer run.
      // This is the L4 dynamic-delegation hook — composer fans out per host.
      const [kalamStance, anchorStance] = await Promise.all([
        doIdeology(ctx, {
          sourceId: params.sourceId,
          userTokenId: params.userTokenId,
          hostId: params.hostMapping.KALAM,
          parentRunId: composerRunId,
        }),
        doIdeology(ctx, {
          sourceId: params.sourceId,
          userTokenId: params.userTokenId,
          hostId: params.hostMapping.ANCHOR,
          parentRunId: composerRunId,
        }),
      ]);

      const prompt = buildPrompt(
        kalam,
        anchor,
        kalamStance,
        anchorStance,
        source.title,
        source.rawText,
      );

      const client = new Anthropic({ apiKey });
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      });
      const text = resp.content.find((b) => b.type === "text");
      if (!text || text.type !== "text") throw new Error("no text block in response");
      const dialogue = validateDialogue(JSON.parse(stripFences(text.text)));

      const episodeId: Id<"episodes"> = await ctx.runMutation(
        internal.episodes.insertFromRunInternal,
        {
          userTokenId: params.userTokenId,
          sourceId: params.sourceId,
          runId: composerRunId,
          episodeTitle: dialogue.episode_title,
          sourceTitle: dialogue.source_title,
          dialogue,
          promptVersion: PROMPT_VERSION,
          hostMapping: params.hostMapping,
        },
      );

      const tokensIn = resp.usage?.input_tokens ?? 0;
      const tokensOut = resp.usage?.output_tokens ?? 0;
      return {
        output: { episodeId, episodeTitle: dialogue.episode_title },
        tokensIn,
        tokensOut,
        costUsd: estimateClaudeCost(MODEL, tokensIn, tokensOut),
        episodeId,
      };
    },
  );

  return { episodeId: (output.output as { episodeId: Id<"episodes"> }).episodeId, runId };
}

// CLI-invokable smoke variant. Skips auth — caller passes userTokenId.
export const runInternal = internalAction({
  args: {
    sourceId: v.id("sources"),
    userTokenId: v.string(),
    kalamHostId: v.id("hosts"),
    anchorHostId: v.id("hosts"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ episodeId: Id<"episodes">; runId: Id<"generationRuns"> }> => {
    return await doCompose(ctx, {
      sourceId: args.sourceId,
      userTokenId: args.userTokenId,
      hostMapping: { KALAM: args.kalamHostId, ANCHOR: args.anchorHostId },
    });
  },
});
