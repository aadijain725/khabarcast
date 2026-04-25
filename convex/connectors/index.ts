"use node";

// phase 4 (MAAS): registry. Researcher picks the connector matching
// userFeeds.kind. Adding a new newsletter source = drop a new connector
// file + add a line here + extend the userFeeds.kind union in schema.ts.

import type { Connector } from "./types";
import { substack } from "./substack";
import { genericRss } from "./genericRss";

const REGISTRY: Record<string, Connector> = {
  substack,
  rss: genericRss,
};

export function getConnector(kind: string): Connector {
  const c = REGISTRY[kind];
  if (!c) throw new Error(`no connector registered for kind="${kind}"`);
  return c;
}

export type { Connector, RawArticle } from "./types";
