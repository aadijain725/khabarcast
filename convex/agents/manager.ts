"use node";

// phase 4 (MAAS): MANAGER agent. Top-level intent router. Two public actions:
//
// - `onboard` — runs curator bootstrap; returns feeds + topic suggestions
//   for the UI. Does NOT commit (UI commits after user selects).
//
// - `generateEpisode` — runs the full pipeline:
//     researcher → composer (which spawns ideology agents) → renderAudio.
//   Each step is a child run of the manager's root run, so the trace tree
//   on /app/runs shows the full hierarchy.
//
// Stub today — implementation lives on a worktree branch (worktree-manager).

import { v } from "convex/values";
import { action } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const onboard = action({
  args: {
    substackHandle: v.optional(v.string()),
  },
  handler: async (
    _ctx,
    _args,
  ): Promise<{
    feedsDiscovered: { kind: "substack" | "rss"; handle: string; title: string }[];
    suggestedTopics: string[];
  }> => {
    throw new Error("manager.onboard: not implemented yet — pending worktree-manager merge");
  },
});

export const generateEpisode = action({
  args: {
    kalamHostId: v.id("hosts"),
    anchorHostId: v.id("hosts"),
  },
  handler: async (
    _ctx,
    _args,
  ): Promise<{
    rootRunId: Id<"generationRuns">;
    sourceId: Id<"sources">;
    episodeId: Id<"episodes">;
    audioFileId?: Id<"_storage">;
    audioDurationSec?: number;
  }> => {
    throw new Error("manager.generateEpisode: not implemented yet — pending worktree-manager merge");
  },
});
