"use node";

// phase 4 (MAAS): RESEARCHER agent. Reads userFeeds + userTopics, dispatches
// to the matching connector for each feed, fetches latest N posts, then asks
// claude to rank them against the user's topic preferences. Persists the
// chosen post as a `sources` row and returns sourceId for the composer.
//
// Stub today — implementation lives on a worktree branch (worktree-researcher).
// Manager imports `doResearch` from here; the worktree agent fills in the body.

import { ActionCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export type ResearchResult = {
  sourceId: Id<"sources">;
  candidateCount: number;
  chosenTitle: string;
  chosenLink: string;
  topicMatches: string[];
};

export async function doResearch(
  _ctx: ActionCtx,
  _params: {
    userTokenId: string;
    parentRunId?: Id<"generationRuns">;
    feedLimit?: number;
  },
): Promise<ResearchResult> {
  throw new Error("doResearch: not implemented yet — pending worktree-researcher merge");
}
