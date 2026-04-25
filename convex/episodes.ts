import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { dialogueValidator } from "./schema";

export const get = query({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args): Promise<Doc<"episodes"> | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db.get(args.episodeId);
    if (!row) return null;
    if (row.userTokenId !== userId) return null;
    return row;
  },
});

export const getWithAudioUrl = query({
  args: { episodeId: v.id("episodes") },
  handler: async (
    ctx,
    args,
  ): Promise<(Doc<"episodes"> & { audioUrl: string | null }) | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db.get(args.episodeId);
    if (!row) return null;
    if (row.userTokenId !== userId) return null;
    const audioUrl = row.audioFileId
      ? await ctx.storage.getUrl(row.audioFileId)
      : null;
    return { ...row, audioUrl };
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx): Promise<Array<Doc<"episodes">>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("episodes")
      .withIndex("by_userToken", (q) => q.eq("userTokenId", userId))
      .order("desc")
      .take(50);
  },
});

export const getInternal = internalQuery({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args): Promise<Doc<"episodes"> | null> => {
    return await ctx.db.get(args.episodeId);
  },
});

export const setAudioRenderingInternal = internalMutation({
  args: { episodeId: v.id("episodes"), voiceConfigVersion: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.episodeId, {
      audioStatus: "rendering",
      voiceConfigVersion: args.voiceConfigVersion,
      audioError: undefined,
    });
  },
});

export const setAudioReadyInternal = internalMutation({
  args: {
    episodeId: v.id("episodes"),
    audioFileId: v.id("_storage"),
    audioDurationSec: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.episodeId, {
      audioStatus: "ready",
      audioFileId: args.audioFileId,
      audioDurationSec: args.audioDurationSec,
    });
  },
});

export const setAudioErrorInternal = internalMutation({
  args: { episodeId: v.id("episodes"), audioError: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.episodeId, {
      audioStatus: "error",
      audioError: args.audioError.slice(0, 1000),
    });
  },
});

export const insertFromRunInternal = internalMutation({
  args: {
    userTokenId: v.string(),
    sourceId: v.id("sources"),
    runId: v.id("generationRuns"),
    episodeTitle: v.string(),
    sourceTitle: v.string(),
    dialogue: dialogueValidator,
    promptVersion: v.string(),
    // phase 4 (MAAS): which host record fills each slot. Optional so phase-1
    // generateScript callers (which don't know about hosts table) still work.
    hostMapping: v.optional(
      v.object({
        KALAM: v.id("hosts"),
        ANCHOR: v.id("hosts"),
      }),
    ),
  },
  handler: async (ctx, args): Promise<Id<"episodes">> => {
    return await ctx.db.insert("episodes", {
      userTokenId: args.userTokenId,
      sourceId: args.sourceId,
      runId: args.runId,
      episodeTitle: args.episodeTitle,
      sourceTitle: args.sourceTitle,
      dialogue: args.dialogue,
      promptVersion: args.promptVersion,
      hostMapping: args.hostMapping,
    });
  },
});
