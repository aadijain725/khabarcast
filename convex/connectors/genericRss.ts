"use node";

// phase 4 (MAAS): paste-any-feed escape hatch. handle = full RSS/Atom URL.
// Same parser as substack — only the URL handling differs.

import { fetchFeedItems } from "../pipeline/fetchSource";
import type { Connector, RawArticle } from "./types";

export const genericRss: Connector = {
  kind: "rss",
  async fetchLatest(handle: string, n: number = 5): Promise<RawArticle[]> {
    if (!handle.includes("://")) {
      throw new Error(`rss connector needs a full URL, got: ${handle}`);
    }
    const items = await fetchFeedItems(handle, n);
    return items.map((it) => ({
      title: it.title,
      link: it.link,
      rawText: it.rawText,
      wordCount: it.wordCount,
      feedKind: "rss",
      feedHandle: handle,
    }));
  },
};
