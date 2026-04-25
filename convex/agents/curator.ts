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
//
// Stub today — implementation lives on a worktree branch (worktree-curator).
// Manager imports both functions from here; the worktree agent fills in bodies.

import { ActionCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export type CuratorBootstrapResult = {
  feedsDiscovered: { kind: "substack" | "rss"; handle: string; title: string }[];
  suggestedTopics: string[];
};

export type CuratorFeedbackResult = {
  reweightedTopics: { topic: string; weight: number; delta: number }[];
};

export async function doCuratorBootstrap(
  _ctx: ActionCtx,
  _params: {
    userTokenId: string;
    substackHandle?: string;
    parentRunId?: Id<"generationRuns">;
  },
): Promise<CuratorBootstrapResult> {
  throw new Error("doCuratorBootstrap: not implemented yet — pending worktree-curator merge");
}

export async function doCuratorFeedback(
  _ctx: ActionCtx,
  _params: {
    userTokenId: string;
    episodeId: Id<"episodes">;
    parentRunId?: Id<"generationRuns">;
  },
): Promise<CuratorFeedbackResult> {
  throw new Error("doCuratorFeedback: not implemented yet — pending worktree-curator merge");
}
