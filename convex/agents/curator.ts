"use node";

// phase 4 (MAAS): CURATOR agent. Two modes:
//
// 1. Bootstrap (onboarding): scrape substack profile if user has handle,
//    cluster discovered publications into topic buckets via claude, return
//    topic suggestions for UI to render as buttons. UI calls userTopics.upsert
//    + userFeeds.add to commit user-selected entries.
//
// 2. Feedback (post-episode): read topicFlags for an episode, reweight
//    userTopics rows accordingly. Positive flags → +weight, negative → -weight.

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { action, ActionCtx, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { withTrace, estimateClaudeCost } from "./lib/runLog";
import { fetchRawPublic } from "../pipeline/fetchSource";

const PROMPT_VERSION = "curator-v1-2026-04-25";
const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 512;
const MAX_DISCOVERED = 25;

// Cold-start fallback list — solid generalist substacks across politics,
// econ, science, AI. Used when the user has no substack handle OR when
// the profile scrape yields zero publications (private profile, blocked).
const FALLBACK_FEEDS: Array<{ handle: string; title: string }> = [
  { handle: "astralcodexten", title: "Astral Codex Ten" },
  { handle: "noahpinion", title: "Noahpinion" },
  { handle: "slowboring", title: "Slow Boring" },
  { handle: "thefuturisticfarm", title: "Futuristic Farm" },
  { handle: "bariweiss", title: "The Free Press" },
];

const FALLBACK_TOPICS: string[] = [
  "technology and AI",
  "economics and policy",
  "science and progress",
  "culture and society",
  "politics and current events",
];

// substack reserves these subdomains for app routes — never publication handles
const RESERVED_SUBDOMAINS = new Set([
  "substack",
  "open",
  "on",
  "www",
  "app",
  "api",
  "blog",
  "help",
  "about",
  "support",
]);

export type CuratorBootstrapResult = {
  feedsDiscovered: { kind: "substack" | "rss"; handle: string; title: string }[];
  suggestedTopics: string[];
};

export type CuratorFeedbackResult = {
  reweightedTopics: { topic: string; weight: number; delta: number }[];
};

function stripFences(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1].trim() : t;
}

// Pull substack publication subdomains out of a profile page. Substack profile
// pages embed publication links as <a href="https://<sub>.substack.com/...">.
// We dedupe and filter reserved names + the user's own handle so we don't
// recommend the user back to themselves.
function extractSubstackHandles(html: string, ownHandle?: string): string[] {
  const re = /https?:\/\/([a-z0-9-]+)\.substack\.com/gi;
  const seen = new Set<string>();
  const own = ownHandle?.toLowerCase().trim();
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const handle = match[1].toLowerCase();
    if (RESERVED_SUBDOMAINS.has(handle)) continue;
    if (own && handle === own) continue;
    seen.add(handle);
    if (seen.size >= MAX_DISCOVERED) break;
  }
  return Array.from(seen);
}

// Best-effort title from handle. We don't burn a fetch per publication just to
// get the proper title — the UI can hydrate later. Format the handle as a
// readable label so the bootstrap response stays useful out of the box.
function prettifyHandle(handle: string): string {
  return handle
    .split("-")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function buildClusterPrompt(
  feeds: Array<{ handle: string; title: string }>,
): string {
  const list = feeds
    .map((f, i) => `${i + 1}. ${f.title} (@${f.handle})`)
    .join("\n");
  return `You cluster newsletter subscriptions into topic preferences for a personalized podcast app.

Below is a list of newsletters a user follows or is being recommended. Propose 5 to 7 high-level topic categories the user is most likely to care about, based on these subscriptions.

# Newsletters
${list}

# Output (strict JSON, no prose, no fences)
{
  "topics": ["topic 1", "topic 2", ...]
}

# Rules
- 5 to 7 topics, no more no less unless that is impossible.
- Each topic = a short noun phrase, 2-5 words, lowercase. Examples: "AI safety and policy", "macro economics", "global politics".
- Topics should be distinct — do not list both "AI" and "artificial intelligence".
- Topics must be grounded in the newsletters listed. Do not invent unrelated categories.
- Output JSON only.`;
}

function validateTopics(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") throw new Error("not an object");
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.topics)) throw new Error("topics must be array");
  const out: string[] = [];
  for (const t of r.topics) {
    if (typeof t !== "string") continue;
    const trimmed = t.trim().toLowerCase();
    if (trimmed) out.push(trimmed);
  }
  // dedupe preserving order
  return Array.from(new Set(out));
}

function flagDelta(kind: Doc<"topicFlags">["kind"]): number {
  switch (kind) {
    case "good":
      return 2;
    case "bad":
      return -2;
    case "too-long":
      return -1;
    case "off-topic":
      return -2;
  }
}

export async function doCuratorBootstrap(
  ctx: ActionCtx,
  params: {
    userTokenId: string;
    substackHandle?: string;
    parentRunId?: Id<"generationRuns">;
  },
): Promise<CuratorBootstrapResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set on convex deployment");

  const { output } = await withTrace(
    ctx,
    {
      userTokenId: params.userTokenId,
      parentRunId: params.parentRunId,
      step: "curator",
      agentName: "curator-bootstrap",
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      input: {
        userTokenId: params.userTokenId,
        substackHandle: params.substackHandle ?? null,
      },
    },
    async () => {
      // 1. Discover feeds from substack profile or fall back to curated list.
      let feedsDiscovered: CuratorBootstrapResult["feedsDiscovered"] = [];
      const handle = params.substackHandle?.trim();

      if (handle) {
        try {
          const html = await fetchRawPublic(
            `https://substack.com/@${encodeURIComponent(handle)}`,
          );
          const subs = extractSubstackHandles(html, handle);
          feedsDiscovered = subs.map((s) => ({
            kind: "substack" as const,
            handle: s,
            title: prettifyHandle(s),
          }));
        } catch (err) {
          // network error / 404 / blocked → fall through to fallback
          console.warn(
            `curator: substack profile scrape failed for ${handle}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }

      if (feedsDiscovered.length === 0) {
        feedsDiscovered = FALLBACK_FEEDS.map((f) => ({
          kind: "substack" as const,
          handle: f.handle,
          title: f.title,
        }));
      }

      // 2. Cluster into topics via claude-haiku.
      let suggestedTopics: string[] = [];
      let tokensIn = 0;
      let tokensOut = 0;

      try {
        const client = new Anthropic({ apiKey });
        const resp = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          messages: [
            { role: "user", content: buildClusterPrompt(feedsDiscovered) },
          ],
        });
        tokensIn = resp.usage?.input_tokens ?? 0;
        tokensOut = resp.usage?.output_tokens ?? 0;
        const text = resp.content.find((b) => b.type === "text");
        if (!text || text.type !== "text") throw new Error("no text block");
        const parsed = JSON.parse(stripFences(text.text));
        const topics = validateTopics(parsed);
        if (topics.length < 3) throw new Error(`only ${topics.length} topics`);
        suggestedTopics = topics;
      } catch (err) {
        console.warn(
          `curator: topic clustering failed, using fallback: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        suggestedTopics = [...FALLBACK_TOPICS];
      }

      const result: CuratorBootstrapResult = {
        feedsDiscovered,
        suggestedTopics,
      };
      return {
        output: result,
        tokensIn,
        tokensOut,
        costUsd: estimateClaudeCost(MODEL, tokensIn, tokensOut),
      };
    },
  );

  return output.output as CuratorBootstrapResult;
}

export async function doCuratorFeedback(
  ctx: ActionCtx,
  params: {
    userTokenId: string;
    episodeId: Id<"episodes">;
    parentRunId?: Id<"generationRuns">;
  },
): Promise<CuratorFeedbackResult> {
  const { output } = await withTrace(
    ctx,
    {
      userTokenId: params.userTokenId,
      parentRunId: params.parentRunId,
      step: "curator",
      agentName: "curator-feedback",
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      input: {
        userTokenId: params.userTokenId,
        episodeId: params.episodeId,
      },
    },
    async () => {
      const episode = await ctx.runQuery(internal.episodes.getInternal, {
        episodeId: params.episodeId,
      });
      if (!episode) throw new Error("episode not found");
      if (episode.userTokenId !== params.userTokenId) {
        throw new Error("episode not owned");
      }

      const flags = await ctx.runQuery(
        internal.topicFlags.listForEpisodeInternal,
        {
          episodeId: params.episodeId,
          userTokenId: params.userTokenId,
        },
      );

      // Aggregate per-topic delta. Multiple flags on the same topic stack.
      const perTopic = new Map<string, number>();
      for (const flag of flags) {
        const topicEntry = episode.dialogue.topics[flag.topicIndex];
        if (!topicEntry) continue; // stale flag, topic gone
        const topic = topicEntry.title.trim();
        if (!topic) continue;
        perTopic.set(topic, (perTopic.get(topic) ?? 0) + flagDelta(flag.kind));
      }

      // Apply deltas to userTopics, then re-read to capture post-update weights.
      for (const [topic, delta] of perTopic) {
        await ctx.runMutation(internal.userTopics.upsertInternal, {
          userTokenId: params.userTokenId,
          topic,
          delta,
          source: "feedback",
        });
      }

      // Re-read user's topic rows so we can return the post-update weight per
      // topic. listMineInternal returns all rows; we filter to the ones we
      // just touched. Cheaper than a per-topic point query.
      const allTopics = await ctx.runQuery(
        internal.userTopics.listMineInternal,
        { userTokenId: params.userTokenId },
      );
      const weightByTopic = new Map<string, number>();
      for (const row of allTopics) weightByTopic.set(row.topic, row.weight);

      const reweightedTopics: CuratorFeedbackResult["reweightedTopics"] = [];
      for (const [topic, delta] of perTopic) {
        reweightedTopics.push({
          topic,
          weight: weightByTopic.get(topic) ?? 0,
          delta,
        });
      }

      return {
        output: { reweightedTopics, flagCount: flags.length },
        // No claude call here — feedback is pure DB math. Cost = 0.
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
      };
    },
  );

  return {
    reweightedTopics: (output.output as { reweightedTopics: CuratorFeedbackResult["reweightedTopics"] })
      .reweightedTopics,
  };
}

// Public auth-wrapped action for /app/curate "improve from this episode" button.
export const feedback = action({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args): Promise<CuratorFeedbackResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("not authenticated");
    return await doCuratorFeedback(ctx, {
      userTokenId: identity.tokenIdentifier,
      episodeId: args.episodeId,
    });
  },
});

// CLI-invokable smoke variants. Skip auth — caller passes userTokenId.
export const bootstrapInternal = internalAction({
  args: {
    userTokenId: v.string(),
    substackHandle: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CuratorBootstrapResult> => {
    return await doCuratorBootstrap(ctx, {
      userTokenId: args.userTokenId,
      substackHandle: args.substackHandle,
    });
  },
});

export const feedbackInternal = internalAction({
  args: {
    userTokenId: v.string(),
    episodeId: v.id("episodes"),
  },
  handler: async (ctx, args): Promise<CuratorFeedbackResult> => {
    return await doCuratorFeedback(ctx, {
      userTokenId: args.userTokenId,
      episodeId: args.episodeId,
    });
  },
});
