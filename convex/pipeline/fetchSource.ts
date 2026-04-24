"use node";

import Parser from "rss-parser";
import { v } from "convex/values";
import { action, internalAction, ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

const MIN_WORDS = 300;

// Decode common HTML entities (named + decimal + hex). Substack feeds often
// include `&#8217;` etc. inside content:encoded which survive the tag strip.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#?[a-zA-Z0-9]+);/g, (match, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const cp = parseInt(body.slice(2), 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : match;
    }
    if (body.startsWith("#")) {
      const cp = parseInt(body.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : match;
    }
    return NAMED_ENTITIES[body] ?? match;
  });
}

function cleanArticle(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")).trim();
}

export async function doFetch(
  ctx: ActionCtx,
  params: { feedUrl: string; itemIndex?: number; userTokenId: string },
): Promise<{ sourceId: Id<"sources">; wordCount: number; title: string }> {
  const parser: Parser = new Parser();
  const feed = await parser.parseURL(params.feedUrl);
  const idx = params.itemIndex ?? 0;
  const item = feed.items[idx];
  if (!item) throw new Error(`feed has no item at index ${idx}`);

  const html =
    ((item as unknown as Record<string, string>)["content:encoded"] ||
      item.content ||
      "") as string;
  const rawText = cleanArticle(html);
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;

  if (wordCount < MIN_WORDS) {
    throw new Error(`article too thin: ${wordCount} words (min ${MIN_WORDS})`);
  }

  const sourceId: Id<"sources"> = await ctx.runMutation(
    internal.sources.createInternal,
    {
      userTokenId: params.userTokenId,
      title: item.title ?? "untitled",
      rawText,
      url: item.link,
    },
  );

  return { sourceId, wordCount, title: item.title ?? "untitled" };
}

export const run = action({
  args: {
    feedUrl: v.string(),
    itemIndex: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ sourceId: Id<"sources">; wordCount: number; title: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("not authenticated");
    return await doFetch(ctx, {
      feedUrl: args.feedUrl,
      itemIndex: args.itemIndex,
      userTokenId: identity.tokenIdentifier,
    });
  },
});

export const runInternal = internalAction({
  args: {
    feedUrl: v.string(),
    itemIndex: v.optional(v.number()),
    userTokenId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ sourceId: Id<"sources">; wordCount: number; title: string }> => {
    return await doFetch(ctx, args);
  },
});
