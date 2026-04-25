// phase 4 (MAAS): newsletter ingest abstraction. Researcher agent calls
// `fetchLatest(handle, n)` on the connector matching `userFeeds.kind`.
// Connectors return parsed candidates WITHOUT touching the DB — the
// researcher picks the top N and persists only those as `sources` rows.

export type RawArticle = {
  title: string;
  link: string;
  rawText: string;
  wordCount: number;
  feedKind: "substack" | "rss" | "feedly";
  feedHandle: string;
};

export type Connector = {
  kind: "substack" | "rss" | "feedly";
  fetchLatest(handle: string, n?: number): Promise<RawArticle[]>;
};
