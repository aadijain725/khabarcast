"use node";

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

async function fetchRaw(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "KhabarcastBot/1.0 (+https://khabarcast)",
      Accept:
        "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
    },
  });
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  return await res.text();
}

// Lightweight RSS/Atom item extractor — skips XML parsing entirely because
// real-world feeds routinely ship invalid XML (unclosed <img>, stray `>`
// characters in CDATA, HTML namespace mismatches) that strict sax rejects.
// We care about exactly three fields of one item, which regex handles fine.

function extractTagContent(body: string, tagName: string): string | null {
  // Match `<tag ...attrs...>...</tag>` non-greedy across newlines. Use `\b`
  // to avoid matching `<tag:foo>` when looking for just `<tag>`.
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`,
    "i",
  );
  const m = body.match(re);
  if (!m) return null;
  let content = m[1];
  const cdata = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdata) content = cdata[1];
  return content.trim();
}

type ExtractedItem = { title: string; link: string; html: string };

function extractFirstItem(
  xml: string,
  itemIndex: number,
): ExtractedItem | null {
  // RSS 2.0: `<item>`, Atom: `<entry>`. Namespace prefix tolerated
  // (`<atom:entry>`), though uncommon in valid feeds.
  const ITEM_RE =
    /<(?:[a-zA-Z][\w-]*:)?(item|entry)\b[^>]*>([\s\S]*?)<\/(?:[a-zA-Z][\w-]*:)?\1>/gi;
  const items: string[] = [];
  let match;
  while ((match = ITEM_RE.exec(xml)) !== null) items.push(match[2]);
  const body = items[itemIndex];
  if (!body) return null;

  const title = extractTagContent(body, "title") ?? "";
  // Atom feeds link is often <link href="..."/>; try both forms.
  let link = extractTagContent(body, "link") ?? "";
  if (!link) {
    const hrefMatch = body.match(/<link\b[^>]*\bhref=["']([^"']+)["']/i);
    if (hrefMatch) link = hrefMatch[1];
  }
  // Prefer content:encoded (full html body); fall back to content → summary
  // → description in order of richness.
  const html =
    extractTagContent(body, "content:encoded") ??
    extractTagContent(body, "content") ??
    extractTagContent(body, "summary") ??
    extractTagContent(body, "description") ??
    "";

  return { title: decodeEntities(title), link: decodeEntities(link), html };
}

// When no `<item>` or `<entry>` is found, this tells the user WHY in one line.
function diagnoseNoItems(raw: string): string {
  const head = raw.trimStart().slice(0, 120).replace(/\s+/g, " ");
  if (/^<!doctype html|^<html\b/i.test(raw.trimStart())) {
    return `URL returned HTML, not an RSS/Atom feed. Preview: ${head}`;
  }
  if (/^\s*\{/.test(raw)) {
    return `URL returned JSON (JSON Feed not supported). Preview: ${head}`;
  }
  if (!/<(item|entry)\b/i.test(raw)) {
    return `No <item> or <entry> elements in response. Preview: ${head}`;
  }
  return `Could not extract feed items. Preview: ${head}`;
}

export async function doFetch(
  ctx: ActionCtx,
  params: { feedUrl: string; itemIndex?: number; userTokenId: string },
): Promise<{ sourceId: Id<"sources">; wordCount: number; title: string }> {
  const raw = await fetchRaw(params.feedUrl);
  const idx = params.itemIndex ?? 0;
  const item = extractFirstItem(raw, idx);
  if (!item) {
    throw new Error(
      `No feed item at index ${idx}. ${diagnoseNoItems(raw)}`,
    );
  }

  const rawText = cleanArticle(item.html);
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;

  if (wordCount < MIN_WORDS) {
    throw new Error(
      `article too thin: ${wordCount} words (min ${MIN_WORDS}). title="${item.title.slice(0, 80)}"`,
    );
  }

  const sourceId: Id<"sources"> = await ctx.runMutation(
    internal.sources.createInternal,
    {
      userTokenId: params.userTokenId,
      title: item.title || "untitled",
      rawText,
      url: item.link || params.feedUrl,
    },
  );

  return { sourceId, wordCount, title: item.title || "untitled" };
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
