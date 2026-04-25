"use node";

// phase 4 (MAAS): RESEARCHER agent. Reads userFeeds + userTopics, dispatches
// to the matching connector for each feed, fetches latest N posts, dedupes
// by link, then asks claude-haiku-4-5 to rank candidates against the user's
// weighted topic preferences. Persists the chosen post as a `sources` row
// and returns sourceId for the composer.

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { ActionCtx, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { getConnector, RawArticle } from "../connectors";
import { withTrace, estimateClaudeCost } from "./lib/runLog";

const PROMPT_VERSION = "researcher-v1-2026-04-25";
const MODEL = "claude-haiku-4-5";

export type ResearchResult = {
  sourceId: Id<"sources">;
  candidateCount: number;
  chosenTitle: string;
  chosenLink: string;
  topicMatches: string[];
};

type RankResult = {
  chosenIndex: number;
  topicMatches: string[];
  reasoning: string;
};

function stripFences(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1].trim() : t;
}

function dedupeByLink(candidates: RawArticle[]): RawArticle[] {
  const seen = new Set<string>();
  const out: RawArticle[] = [];
  for (const c of candidates) {
    const key = c.link || `${c.title}::${c.rawText.slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function buildRankPrompt(
  candidates: RawArticle[],
  topics: { topic: string; weight: number }[],
): string {
  const topicLines = topics
    .map((t, i) => `  ${i + 1}. ${t.topic} (weight ${t.weight})`)
    .join("\n");
  const candidateLines = candidates
    .map((c, i) => {
      const head = c.rawText.slice(0, 220).replace(/\s+/g, " ");
      return `[${i}] title: ${c.title}\n    excerpt: ${head}`;
    })
    .join("\n");

  return `You are ranking candidate newsletter articles against a user's topic preferences for a podcast generation pipeline. Pick the single best article.

User topics (weights — higher means more interested):
${topicLines}

Candidates (indexed):
${candidateLines}

Output STRICT JSON, no prose, no markdown fences:
{"chosenIndex": <integer 0..${candidates.length - 1}>, "topicMatches": ["topic1", ...], "reasoning": "<= 1 sentence"}

topicMatches must be a subset of the user topics that this article actually hits.
reasoning: 1 sentence on why this article won.`;
}

function validateRank(raw: unknown, candidateCount: number): RankResult {
  if (!raw || typeof raw !== "object") throw new Error("not an object");
  const r = raw as Record<string, unknown>;
  if (typeof r.chosenIndex !== "number" || !Number.isInteger(r.chosenIndex))
    throw new Error("chosenIndex must be integer");
  if (r.chosenIndex < 0 || r.chosenIndex >= candidateCount)
    throw new Error(`chosenIndex out of range 0..${candidateCount - 1}`);
  if (!Array.isArray(r.topicMatches)) throw new Error("topicMatches must be array");
  for (const t of r.topicMatches) {
    if (typeof t !== "string") throw new Error("topicMatches entries must be strings");
  }
  if (typeof r.reasoning !== "string") throw new Error("reasoning must be string");
  return {
    chosenIndex: r.chosenIndex,
    topicMatches: r.topicMatches as string[],
    reasoning: r.reasoning,
  };
}

export async function doResearch(
  ctx: ActionCtx,
  params: {
    userTokenId: string;
    parentRunId?: Id<"generationRuns">;
    feedLimit?: number;
  },
): Promise<ResearchResult> {
  const feeds = await ctx.runQuery(internal.userFeeds.listMineInternal, {
    userTokenId: params.userTokenId,
  });
  if (feeds.length === 0) throw new Error("no feeds configured — onboarding required");

  const topics = await ctx.runQuery(internal.userTopics.listMineInternal, {
    userTokenId: params.userTokenId,
  });

  const { output } = await withTrace(
    ctx,
    {
      userTokenId: params.userTokenId,
      parentRunId: params.parentRunId,
      step: "researcher",
      agentName: "researcher",
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      input: {
        feedCount: feeds.length,
        topicCount: topics.length,
        feedLimit: params.feedLimit ?? 5,
      },
    },
    async () => {
      const limit = params.feedLimit ?? 5;
      const collected: RawArticle[] = [];
      for (const feed of feeds) {
        try {
          const items = await getConnector(feed.kind).fetchLatest(feed.handle, limit);
          collected.push(...items);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(
            `[researcher] feed failed kind=${feed.kind} handle=${feed.handle} err=${msg}`,
          );
        }
      }
      const candidates = dedupeByLink(collected);
      if (candidates.length === 0) {
        throw new Error(`no candidate articles found across ${feeds.length} feeds`);
      }

      // Filter topics with positive weight only — negative weights are signals to AVOID.
      const positiveTopics = topics
        .filter((t) => t.weight > 0)
        .map((t) => ({ topic: t.topic, weight: t.weight }));

      let chosenIndex = 0;
      let topicMatches: string[] = [];
      let tokensIn = 0;
      let tokensOut = 0;

      if (positiveTopics.length === 0) {
        // No topic prefs → take first (most recent from first feed). No claude call.
        chosenIndex = 0;
      } else {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set on convex deployment");
        try {
          const prompt = buildRankPrompt(candidates, positiveTopics);
          const client = new Anthropic({ apiKey });
          const resp = await client.messages.create({
            model: MODEL,
            max_tokens: 512,
            messages: [{ role: "user", content: prompt }],
          });
          tokensIn = resp.usage?.input_tokens ?? 0;
          tokensOut = resp.usage?.output_tokens ?? 0;
          const textBlock = resp.content.find((b) => b.type === "text");
          if (!textBlock || textBlock.type !== "text")
            throw new Error("no text block in claude response");
          const ranked = validateRank(
            JSON.parse(stripFences(textBlock.text)),
            candidates.length,
          );
          chosenIndex = ranked.chosenIndex;
          topicMatches = ranked.topicMatches;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[researcher] rank failed, fallback to first: ${msg}`);
          chosenIndex = 0;
          topicMatches = [];
        }
      }

      const chosen = candidates[chosenIndex];
      const sourceId: Id<"sources"> = await ctx.runMutation(
        internal.sources.createInternal,
        {
          userTokenId: params.userTokenId,
          title: chosen.title,
          rawText: chosen.rawText,
          url: chosen.link || undefined,
        },
      );

      return {
        output: {
          sourceId,
          chosenTitle: chosen.title,
          chosenLink: chosen.link,
          candidateCount: candidates.length,
          topicMatches,
        },
        tokensIn,
        tokensOut,
        costUsd: estimateClaudeCost(MODEL, tokensIn, tokensOut),
      };
    },
  );

  const o = output.output as {
    sourceId: Id<"sources">;
    chosenTitle: string;
    chosenLink: string;
    candidateCount: number;
    topicMatches: string[];
  };
  return {
    sourceId: o.sourceId,
    candidateCount: o.candidateCount,
    chosenTitle: o.chosenTitle,
    chosenLink: o.chosenLink,
    topicMatches: o.topicMatches,
  };
}

// CLI-invokable smoke variant. Skips auth — caller passes userTokenId.
export const runInternal = internalAction({
  args: {
    userTokenId: v.string(),
    feedLimit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ResearchResult> => {
    return await doResearch(ctx, {
      userTokenId: args.userTokenId,
      feedLimit: args.feedLimit,
    });
  },
});
