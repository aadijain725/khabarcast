import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const createInternal = internalMutation({
  args: {
    userTokenId: v.string(),
    sourceId: v.id("sources"),
    model: v.string(),
    promptVersion: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"generationRuns">> => {
    return await ctx.db.insert("generationRuns", {
      userTokenId: args.userTokenId,
      sourceId: args.sourceId,
      status: "pending",
      model: args.model,
      promptVersion: args.promptVersion,
      startedAt: Date.now(),
    });
  },
});

export const markOkInternal = internalMutation({
  args: {
    runId: v.id("generationRuns"),
    episodeId: v.id("episodes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: "ok",
      episodeId: args.episodeId,
      finishedAt: Date.now(),
    });
  },
});

export const markErrorInternal = internalMutation({
  args: {
    runId: v.id("generationRuns"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: "error",
      errorMessage: args.errorMessage,
      finishedAt: Date.now(),
    });
  },
});
