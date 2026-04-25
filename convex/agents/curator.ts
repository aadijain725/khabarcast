"use node";

// phase 4 (MAAS): CURATOR agent. Three modes:
//
// 1. Bootstrap-from-feeds (onboarding mode A): user pastes one feed per line
//    (substack handle, @handle, full URL, or RSS URL). Curator validates each
//    line by fetching one item; clusters topics from validated feeds via
//    claude. NO silent fallback — invalid lines are surfaced back to UI.
//
// 2. Suggest-from-topics (onboarding mode B): user picks topic chips. Curator
//    looks up matching feeds in the hand-curated topicCatalog. UI lets the
//    user multi-select before commit.
//
// 3. Feedback (post-episode): read topicFlags for an episode, reweight
//    userTopics rows accordingly. Positive flags → +weight, negative → -weight.

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { action, ActionCtx, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { withTrace, estimateClaudeCost } from "./lib/runLog";
import { fetchFeedItems } from "../pipeline/fetchSource";
import {
  feedsForTopics,
  type CatalogFeed,
} from "../connectors/topicCatalog";

const PROMPT_VERSION = "curator-v2-2026-04-25";
const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 512;

// substack reserves these subdomains for app routes — never publication handles
const RESERVED_SUBSTACK_SUBDOMAINS = new Set([
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

export type ValidatedFeed = {
  kind: "substack" | "rss";
  handle: string;
  title: string;
  feedUrl: string;
};

export type RejectedLine = {
  line: string;
  reason: string;
};

export type CuratorBootstrapResult = {
  feedsValidated: ValidatedFeed[];
  feedsRejected: RejectedLine[];
  suggestedTopics: string[];
};

export type CuratorFromTopicsResult = {
  feedsSuggested: ValidatedFeed[];
};

export type CuratorFeedbackResult = {
  reweightedTopics: { topic: string; weight: number; delta: number }[];
};

function stripFences(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1].trim() : t;
}

// Parse one user-input line into a normalized feed descriptor. Throws on
// unrecognized shapes so the caller can surface the line back to the user
// with the failure reason. NOT a fetch — pure string parsing.
type ParsedFeedLine =
  | { kind: "substack"; handle: string; feedUrl: string }
  | { kind: "rss"; handle: string; feedUrl: string };

function parseFeedLine(raw: string): ParsedFeedLine {
  const line = raw.trim();
  if (!line) throw new Error("empty line");

  // Pattern 1: full https URL
  if (/^https?:\/\//i.test(line)) {
    const url = line.replace(/\/+$/, "");
    // Substack publication URL: https://<sub>.substack.com[/...]
    const subMatch = url.match(
      /^https?:\/\/([a-z0-9-]+)\.substack\.com(?:\/.*)?$/i,
    );
    if (subMatch) {
      const sub = subMatch[1].toLowerCase();
      if (RESERVED_SUBSTACK_SUBDOMAINS.has(sub)) {
        throw new Error(`"${sub}" is a substack reserved subdomain, not a publication`);
      }
      return {
        kind: "substack",
        handle: sub,
        feedUrl: `https://${sub}.substack.com/feed`,
      };
    }
    // Already-suffixed feed URL → leave as-is
    if (/\/(feed|rss|atom)(\.xml)?$/i.test(url)) {
      return { kind: "rss", handle: url, feedUrl: url };
    }
    // Bare domain → try /feed (works for most wordpress/substack/ghost/etc)
    return { kind: "rss", handle: url, feedUrl: `${url}/feed` };
  }

  // Pattern 2: bare handle ("noahpinion") or "@handle" → assume substack
  const handle = line.replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(handle)) {
    throw new Error(
      `"${line}" is not a valid substack handle or URL. use the publication subdomain (e.g. "noahpinion") or a full feed URL.`,
    );
  }
  if (RESERVED_SUBSTACK_SUBDOMAINS.has(handle)) {
    throw new Error(`"${handle}" is a substack reserved subdomain, not a publication`);
  }
  return {
    kind: "substack",
    handle,
    feedUrl: `https://${handle}.substack.com/feed`,
  };
}

// Validate a parsed feed by fetching one item. ≥1 item back = accept and
// adopt the item's title-derived publication name as a best-effort `title`.
async function validateFeedLine(line: string): Promise<ValidatedFeed> {
  const parsed = parseFeedLine(line);
  let items;
  try {
    items = await fetchFeedItems(parsed.feedUrl, 1);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`fetch failed: ${msg}`);
  }
  if (items.length === 0) {
    throw new Error(
      `feed returned 0 items (post too short, feed empty, or wrong URL)`,
    );
  }
  // Best-effort title: prettified handle. The connector layer doesn't expose
  // <channel><title> separately so we'd have to re-fetch + re-parse to get
  // the publication name. Cheap-and-good-enough is fine for the picker.
  const title = prettifyHandle(parsed.handle);
  return {
    kind: parsed.kind,
    handle: parsed.handle,
    feedUrl: parsed.feedUrl,
    title,
  };
}

function prettifyHandle(handle: string): string {
  // Strip protocol + path for URL-form handles
  const cleaned = handle
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/\.substack\.com$/, "")
    .replace(/^www\./, "");
  return cleaned
    .split(/[-.]/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
    .trim();
}

function buildClusterPrompt(feeds: ValidatedFeed[]): string {
  const list = feeds
    .map((f, i) => `${i + 1}. ${f.title} (@${f.handle}, ${f.kind})`)
    .join("\n");
  return `You cluster newsletter subscriptions into topic preferences for a personalized podcast app.

Below are the newsletters this user actually reads. Propose 5 to 7 topic categories the user is most likely to care about, grounded in these specific newsletters.

# Newsletters
${list}

# Output (strict JSON, no prose, no fences)
{
  "topics": ["topic 1", "topic 2", ...]
}

# Rules
- 5 to 7 topics. Fewer ONLY if the newsletters genuinely cover that few areas.
- Each topic = a short noun phrase, 2-5 words, lowercase. Examples: "AI safety and policy", "macro economics", "global politics".
- Topics should be distinct — do not list both "AI" and "artificial intelligence".
- Topics MUST be grounded in the newsletters listed. Do not invent unrelated categories.
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

// ----- bootstrap (mode A: paste feeds) -----

export async function doCuratorBootstrap(
  ctx: ActionCtx,
  params: {
    userTokenId: string;
    feedLines: string[];
    parentRunId?: Id<"generationRuns">;
  },
): Promise<CuratorBootstrapResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set on convex deployment");

  const cleanedLines = params.feedLines
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (cleanedLines.length === 0) {
    throw new Error("no feed lines provided");
  }

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
        lineCount: cleanedLines.length,
      },
    },
    async () => {
      // 1. Validate every line in parallel.
      const settled = await Promise.allSettled(
        cleanedLines.map((line) => validateFeedLine(line)),
      );
      const feedsValidated: ValidatedFeed[] = [];
      const feedsRejected: RejectedLine[] = [];
      const seenHandles = new Set<string>();
      for (let i = 0; i < settled.length; i++) {
        const result = settled[i];
        const line = cleanedLines[i];
        if (result.status === "rejected") {
          feedsRejected.push({
            line,
            reason:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          });
          continue;
        }
        const v = result.value;
        if (seenHandles.has(v.handle)) {
          feedsRejected.push({ line, reason: "duplicate handle" });
          continue;
        }
        seenHandles.add(v.handle);
        feedsValidated.push(v);
      }

      if (feedsValidated.length === 0) {
        // No silent fallback. Surface the rejections.
        const sample = feedsRejected
          .slice(0, 3)
          .map((r) => `"${r.line}" — ${r.reason}`)
          .join("; ");
        throw new Error(
          `no valid feeds out of ${cleanedLines.length} lines. examples: ${sample}`,
        );
      }

      // 2. Cluster validated feeds into topics via claude-haiku.
      let suggestedTopics: string[] = [];
      let tokensIn = 0;
      let tokensOut = 0;

      try {
        const client = new Anthropic({ apiKey });
        const resp = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          messages: [
            { role: "user", content: buildClusterPrompt(feedsValidated) },
          ],
        });
        tokensIn = resp.usage?.input_tokens ?? 0;
        tokensOut = resp.usage?.output_tokens ?? 0;
        const text = resp.content.find((b) => b.type === "text");
        if (!text || text.type !== "text") throw new Error("no text block");
        const parsed = JSON.parse(stripFences(text.text));
        const topics = validateTopics(parsed);
        if (topics.length === 0) throw new Error("0 topics returned");
        suggestedTopics = topics;
      } catch (err) {
        // Don't silently fall back — leave suggestedTopics empty so the UI
        // can render an explicit "topic clustering failed, add manually"
        // state. Validated feeds are already saved-able regardless.
        console.warn(
          `curator: topic clustering failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        suggestedTopics = [];
      }

      const result: CuratorBootstrapResult = {
        feedsValidated,
        feedsRejected,
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

// ----- suggest from topics (mode B: pick chips) -----

export async function doCuratorFromTopics(
  ctx: ActionCtx,
  params: {
    userTokenId: string;
    topics: string[];
    parentRunId?: Id<"generationRuns">;
  },
): Promise<CuratorFromTopicsResult> {
  const cleaned = params.topics
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
  if (cleaned.length === 0) throw new Error("no topics provided");

  const { output } = await withTrace(
    ctx,
    {
      userTokenId: params.userTokenId,
      parentRunId: params.parentRunId,
      step: "curator",
      agentName: "curator-from-topics",
      model: "catalog-lookup",
      promptVersion: PROMPT_VERSION,
      input: { userTokenId: params.userTokenId, topics: cleaned },
    },
    async () => {
      const matches: CatalogFeed[] = feedsForTopics(cleaned);
      const feedsSuggested: ValidatedFeed[] = matches.map((f) => ({
        kind: f.kind,
        handle: f.handle,
        title: f.displayName,
        feedUrl:
          f.kind === "substack"
            ? `https://${f.handle}.substack.com/feed`
            : f.handle,
      }));
      return {
        output: { feedsSuggested } as CuratorFromTopicsResult,
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
      };
    },
  );

  return output.output as CuratorFromTopicsResult;
}

// ----- feedback (post-episode reweight) -----

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

      const perTopic = new Map<string, number>();
      for (const flag of flags) {
        const topicEntry = episode.dialogue.topics[flag.topicIndex];
        if (!topicEntry) continue;
        const topic = topicEntry.title.trim();
        if (!topic) continue;
        perTopic.set(topic, (perTopic.get(topic) ?? 0) + flagDelta(flag.kind));
      }

      for (const [topic, delta] of perTopic) {
        await ctx.runMutation(internal.userTopics.upsertInternal, {
          userTokenId: params.userTokenId,
          topic,
          delta,
          source: "feedback",
        });
      }

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
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
      };
    },
  );

  return {
    reweightedTopics: (
      output.output as {
        reweightedTopics: CuratorFeedbackResult["reweightedTopics"];
      }
    ).reweightedTopics,
  };
}

// ----- public auth-wrapped actions -----

export const fromTopics = action({
  args: { topics: v.array(v.string()) },
  handler: async (ctx, args): Promise<CuratorFromTopicsResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("not authenticated");
    return await doCuratorFromTopics(ctx, {
      userTokenId: identity.tokenIdentifier,
      topics: args.topics,
    });
  },
});

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

// ----- internal CLI smoke variants -----

export const bootstrapInternal = internalAction({
  args: {
    userTokenId: v.string(),
    feedLines: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<CuratorBootstrapResult> => {
    return await doCuratorBootstrap(ctx, {
      userTokenId: args.userTokenId,
      feedLines: args.feedLines,
    });
  },
});

export const fromTopicsInternal = internalAction({
  args: {
    userTokenId: v.string(),
    topics: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<CuratorFromTopicsResult> => {
    return await doCuratorFromTopics(ctx, {
      userTokenId: args.userTokenId,
      topics: args.topics,
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
