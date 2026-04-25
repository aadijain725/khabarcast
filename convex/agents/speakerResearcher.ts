"use node";

// phase 4 (MAAS): SPEAKER RESEARCHER agent. Given a person's name + slot, returns
// auto-filled host fields (name, persona, ideologyPrompt) so users don't have to
// hand-write them. Wikipedia REST grounds the prompt; falls through to claude-only
// when the page is missing. Pure read — does NOT insert a hosts row. UI calls
// api.hosts.create after the user reviews.

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ActionCtx, action, internalAction } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { withTrace, estimateClaudeCost } from "./lib/runLog";

const PROMPT_VERSION = "speaker-researcher-v1-2026-04-25";
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;

type Slot = "KALAM" | "ANCHOR";

export type SpeakerResearchResult = {
  name: string;
  persona: string;
  ideologyPrompt: string;
  wikipediaUsed: boolean;
};

type WikipediaSummary = {
  extract: string;
  description?: string;
};

function stripFences(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1].trim() : t;
}

// Keyless grounding via Wikipedia REST. Returns null on 404 / non-OK / empty
// extract. Throws only on network error so callers can decide whether to fail
// or fall back to claude-only.
async function fetchWikipediaSummary(personName: string): Promise<WikipediaSummary | null> {
  const slug = encodeURIComponent(personName.trim().replace(/\s+/g, "_"));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "KhabarcastBot/1.0 (https://khabarcast; speaker-research)",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { extract?: string; description?: string };
  if (!body.extract || !body.extract.trim()) return null;
  return {
    extract: body.extract.trim(),
    description: body.description?.trim(),
  };
}

// Slot-conditioned role brief. Lifted in spirit from the seeded Kalam-inspired /
// Skeptical Anchor rows in convex/hosts.ts. Don't tweak without re-validating
// against the existing prompts — composer's debate dynamic depends on this shape.
function slotBrief(slot: Slot): string {
  if (slot === "KALAM") {
    return `KALAM slot — the synthesizer. Tone tends calm, wise, systems-minded.
Lens: pulls specific details up into bigger threads (human progress, civilization, principle).
Job: every topic ends on a constructive takeaway. No moralizing — earn the wisdom through specifics.`;
  }
  return `ANCHOR slot — the skeptic. Tone tends sharp, urgent, allergic to fluff.
Lens: who's missing, what's being papered over, who loses, where's the friction.
Job: push back at least once per topic with a real counter-argument. Prevent soft summary.`;
}

function buildResearchPrompt(personName: string, slot: Slot, wiki: WikipediaSummary | null): string {
  const wikiBlock = wiki
    ? `# Wikipedia summary (grounding — use the facts here, do not invent biography):

${wiki.description ? `Short description: ${wiki.description}\n\n` : ""}${wiki.extract}`
    : `# No Wikipedia summary available. Rely on what you know about this person from training. If you don't know the person, return a refusal note in the "ideologyPrompt" field starting with "INSUFFICIENT_INFO:" and brief generic placeholder values for the rest. Do NOT invent biography.`;

  return `You are generating a speaker profile for a podcast app. The user wants to add "${personName}" as a host filling the ${slot} slot.

# Slot brief
${slotBrief(slot)}

${wikiBlock}

# Your output (strict JSON, no fences, no preamble)

{
  "name": "<short label, e.g. 'Naval-inspired', 'Ambedkar-inspired'>",
  "persona": "<one line, ≤140 chars, ends with 'persona-inspired, not impersonation.'>",
  "ideologyPrompt": "<one paragraph following the exact shape: 'Tone: <tone words>. Lens: <what they emphasize and why>. Job: <what they do with each topic, including the slot's signature behavior — synthesize / push back>. <one signature move that distinguishes them>.'>"
}

# Rules
- name: respect the person's identity but make it clearly persona-inspired (e.g. "Ambedkar-inspired"). Avoid pure first names.
- persona: ≤140 chars, must end exactly with "persona-inspired, not impersonation." This is a legal/ethics constraint. No impersonation language.
- ideologyPrompt: 4-6 sentences. Must include the words "Tone:", "Lens:", "Job:" as anchors. The slot's signature behavior MUST appear (synthesizer or skeptic). Specifics about THIS person's documented thinking — leverage / aphorisms for Naval, institutions / structural justice for Ambedkar, taste / simplicity for Jobs, etc. Avoid stereotypes.
- If you don't know the person AND no Wikipedia was provided, set ideologyPrompt to "INSUFFICIENT_INFO: <one sentence>" and return generic placeholder name + persona. Do NOT hallucinate biography.
- Output JSON only. No fences. No commentary.`;
}

function validateResult(raw: unknown): { name: string; persona: string; ideologyPrompt: string } {
  if (!raw || typeof raw !== "object") throw new Error("not an object");
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== "string" || !r.name.trim()) throw new Error("name required");
  if (typeof r.persona !== "string" || !r.persona.trim()) throw new Error("persona required");
  if (typeof r.ideologyPrompt !== "string" || !r.ideologyPrompt.trim())
    throw new Error("ideologyPrompt required");
  return {
    name: r.name.trim(),
    persona: r.persona.trim(),
    ideologyPrompt: r.ideologyPrompt.trim(),
  };
}

export async function doResearch(
  ctx: ActionCtx,
  params: {
    personName: string;
    slot: Slot;
    userTokenId: string;
    parentRunId?: Id<"generationRuns">;
  },
): Promise<SpeakerResearchResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set on convex deployment");

  const personName = params.personName.trim();
  if (!personName) throw new Error("personName required");

  const { output } = await withTrace(
    ctx,
    {
      userTokenId: params.userTokenId,
      parentRunId: params.parentRunId,
      step: "speakerResearcher",
      agentName: `speaker-researcher-${params.slot}`,
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      input: { personName, slot: params.slot },
    },
    async () => {
      let wiki: WikipediaSummary | null = null;
      try {
        wiki = await fetchWikipediaSummary(personName);
      } catch (err) {
        console.warn(
          `[speakerResearcher] wiki fetch failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }

      const client = new Anthropic({ apiKey });
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: buildResearchPrompt(personName, params.slot, wiki) }],
      });
      const tokensIn = resp.usage?.input_tokens ?? 0;
      const tokensOut = resp.usage?.output_tokens ?? 0;
      const text = resp.content.find((b) => b.type === "text");
      if (!text || text.type !== "text") throw new Error("no text block in claude response");
      const parsed = validateResult(JSON.parse(stripFences(text.text)));

      const result: SpeakerResearchResult = {
        ...parsed,
        wikipediaUsed: wiki !== null,
      };

      return {
        output: result,
        tokensIn,
        tokensOut,
        costUsd: estimateClaudeCost(MODEL, tokensIn, tokensOut),
      };
    },
  );

  return output.output as SpeakerResearchResult;
}

// ----- public auth-wrapped action -----

export const run = action({
  args: {
    personName: v.string(),
    slot: v.union(v.literal("KALAM"), v.literal("ANCHOR")),
  },
  handler: async (ctx, args): Promise<SpeakerResearchResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    return await doResearch(ctx, {
      personName: args.personName,
      slot: args.slot,
      userTokenId: userId,
    });
  },
});

// ----- internal CLI smoke variant -----

export const runInternal = internalAction({
  args: {
    userTokenId: v.string(),
    personName: v.string(),
    slot: v.union(v.literal("KALAM"), v.literal("ANCHOR")),
  },
  handler: async (ctx, args): Promise<SpeakerResearchResult> => {
    return await doResearch(ctx, {
      personName: args.personName,
      slot: args.slot,
      userTokenId: args.userTokenId,
    });
  },
});
