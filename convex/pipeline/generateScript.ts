"use node";

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalAction, ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// Source of truth for this prompt lives in `poc/01-final-prompt.md`.
// Bump PROMPT_VERSION whenever the prompt text below is edited.
const PROMPT_VERSION = "v1-2026-04-24";
const MODEL = "claude-sonnet-4-6";
const ARTICLE_PLACEHOLDER = "<<<PASTE FULL ARTICLE TEXT HERE>>>";

const LOCKED_PROMPT = `You are generating a two-host podcast dialogue from a newsletter article.
Output must be valid JSON only — no prose before or after.

# Hosts

## KALAM (primary host)
Tone: calm, wise, optimistic, systems-minded. Inspired by APJ Abdul Kalam
(scientist, nation-builder) — persona-inspired, not impersonation.
Lens: science, youth, innovation, long-term human/national progress, self-reliance.
Job: synthesize facts into meaning. Connect specific developments to bigger human
or national threads. Every topic must end with a constructive takeaway.

## ANCHOR (interviewer)
Tone: sharp, urgent, skeptical, media-savvy. Inspired by a high-energy Indian
news anchor style — persona-inspired, not impersonation.
Lens: what matters now, what's being missed, where's the controversy.
Job: create friction. You MUST push back at least once per topic. Use phrases
like "but isn't that naive?", "what's the honest counter?", "that sounds nice
— but who loses here?", "is that really new, or are we dressing up the same
thing?". Prevent the episode from becoming a soft summary.

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
  explicitly disagrees or surfaces a real downside.
- KALAM does not end every turn with a platitude — earn the wisdom.
- Don't invent facts not in the source. If the article is thin on a topic,
  pick a different topic.

# Source article

${ARTICLE_PLACEHOLDER}`;

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
  const trimmed = s.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : trimmed;
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

// Core flow — shared by public `run` and internal `runInternal`.
// Callers are responsible for establishing `userTokenId` (auth for public,
// trusted caller for internal).
export async function doGenerate(
  ctx: ActionCtx,
  params: { sourceId: Id<"sources">; userTokenId: string },
): Promise<{ runId: Id<"generationRuns">; episodeId: Id<"episodes"> }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set on convex deployment");

  const source = await ctx.runQuery(internal.sources.getOwnedInternal, {
    sourceId: params.sourceId,
    userTokenId: params.userTokenId,
  });

  const runId: Id<"generationRuns"> = await ctx.runMutation(
    internal.generationRuns.createInternal,
    {
      userTokenId: params.userTokenId,
      sourceId: params.sourceId,
      model: MODEL,
      promptVersion: PROMPT_VERSION,
    },
  );

  try {
    const userContent = LOCKED_PROMPT.replace(
      ARTICLE_PLACEHOLDER,
      `Title: ${source.title}\n\n${source.rawText}`,
    );

    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text")
      throw new Error("no text block in response");

    const jsonText = stripFences(textBlock.text);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      const preview = jsonText.slice(0, 200);
      throw new Error(
        `JSON.parse failed: ${(e as Error).message}. preview: ${preview}`,
      );
    }

    const dialogue = validateDialogue(parsed);

    const episodeId: Id<"episodes"> = await ctx.runMutation(
      internal.episodes.insertFromRunInternal,
      {
        userTokenId: params.userTokenId,
        sourceId: params.sourceId,
        runId,
        episodeTitle: dialogue.episode_title,
        sourceTitle: dialogue.source_title,
        dialogue,
        promptVersion: PROMPT_VERSION,
      },
    );

    await ctx.runMutation(internal.generationRuns.markOkInternal, {
      runId,
      episodeId,
    });

    return { runId, episodeId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.runMutation(internal.generationRuns.markErrorInternal, {
      runId,
      errorMessage: message.slice(0, 1000),
    });
    throw err;
  }
}

export const run = action({
  args: { sourceId: v.id("sources") },
  handler: async (
    ctx,
    args,
  ): Promise<{ runId: Id<"generationRuns">; episodeId: Id<"episodes"> }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    return await doGenerate(ctx, {
      sourceId: args.sourceId,
      userTokenId: userId,
    });
  },
});

// Internal variant — skips auth, requires caller to supply trusted userTokenId.
// Used by smoke tests today and will be used by the orchestrator/cron later.
export const runInternal = internalAction({
  args: {
    sourceId: v.id("sources"),
    userTokenId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ runId: Id<"generationRuns">; episodeId: Id<"episodes"> }> => {
    return await doGenerate(ctx, args);
  },
});
