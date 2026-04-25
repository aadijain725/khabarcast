"use node";

// phase 4 (MAAS): substack connector. handle = subdomain ("astralcodexten")
// or full feed URL. Wraps the existing fetchFeedItems helper so we share the
// regex parser + html decoder + word-count gate that survived 18 real feeds
// in phase 1.

import { fetchFeedItems } from "../pipeline/fetchSource";
import type { Connector, RawArticle } from "./types";

function feedUrlFromHandle(handle: string): string {
  if (handle.includes("://")) return handle.replace(/\/+$/, "") + "/feed";
  if (handle.endsWith("/feed")) return handle;
  return `https://${handle}.substack.com/feed`;
}

export const substack: Connector = {
  kind: "substack",
  async fetchLatest(handle: string, n: number = 5): Promise<RawArticle[]> {
    const url = feedUrlFromHandle(handle);
    const items = await fetchFeedItems(url, n);
    return items.map((it) => ({
      title: it.title,
      link: it.link,
      rawText: it.rawText,
      wordCount: it.wordCount,
      feedKind: "substack",
      feedHandle: handle,
    }));
  },
};
