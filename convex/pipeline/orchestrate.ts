"use node";

import { v } from "convex/values";
import { action, internalAction, ActionCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { doFetch } from "./fetchSource";
import { doGenerate } from "./generateScript";
import { doRender } from "./renderAudio";

type OrchestrateResult = {
  sourceId: Id<"sources">;
  runId: Id<"generationRuns">;
  episodeId: Id<"episodes">;
  audioFileId: Id<"_storage">;
  audioDurationSec: number;
  title: string;
  wordCount: number;
  timings: {
    fetchMs: number;
    generateMs: number;
    renderMs: number;
    totalMs: number;
  };
};

// Straight-line pipeline: fetch → generate → render. Step helpers handle
// their own run/episode persistence + error marking, so a failure mid-chain
// leaves the latest successful state visible in the DB.
async function doOrchestrate(
  ctx: ActionCtx,
  params: {
    feedUrl: string;
    itemIndex?: number;
    userTokenId: string;
  },
): Promise<OrchestrateResult> {
  const t0 = Date.now();
  const fetchResult = await doFetch(ctx, {
    feedUrl: params.feedUrl,
    itemIndex: params.itemIndex,
    userTokenId: params.userTokenId,
  });
  const t1 = Date.now();

  const genResult = await doGenerate(ctx, {
    sourceId: fetchResult.sourceId,
    userTokenId: params.userTokenId,
  });
  const t2 = Date.now();

  const renderResult = await doRender(ctx, {
    episodeId: genResult.episodeId,
    userTokenId: params.userTokenId,
  });
  const t3 = Date.now();

  return {
    sourceId: fetchResult.sourceId,
    runId: genResult.runId,
    episodeId: genResult.episodeId,
    audioFileId: renderResult.audioFileId,
    audioDurationSec: renderResult.audioDurationSec,
    title: fetchResult.title,
    wordCount: fetchResult.wordCount,
    timings: {
      fetchMs: t1 - t0,
      generateMs: t2 - t1,
      renderMs: t3 - t2,
      totalMs: t3 - t0,
    },
  };
}

export const run = action({
  args: {
    feedUrl: v.string(),
    itemIndex: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<OrchestrateResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("not authenticated");
    return await doOrchestrate(ctx, {
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
  handler: async (ctx, args): Promise<OrchestrateResult> => {
    return await doOrchestrate(ctx, args);
  },
});
