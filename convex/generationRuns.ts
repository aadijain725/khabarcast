import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
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

// phase 4 (MAAS): trace-tree mutations. Used by `agents/lib/runLog#withTrace`
// to record each agent step under a parent run, capturing input/output preview,
// tokens, cost, and latency for the /app/runs observability page.

export const createTraceInternal = internalMutation({
  args: {
    userTokenId: v.string(),
    sourceId: v.optional(v.id("sources")),
    parentRunId: v.optional(v.id("generationRuns")),
    step: v.string(),
    agentName: v.string(),
    model: v.string(),
    promptVersion: v.string(),
    inputPreview: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"generationRuns">> => {
    return await ctx.db.insert("generationRuns", {
      userTokenId: args.userTokenId,
      sourceId: args.sourceId,
      status: "pending",
      model: args.model,
      promptVersion: args.promptVersion,
      step: args.step,
      agentName: args.agentName,
      parentRunId: args.parentRunId,
      inputPreview: args.inputPreview,
      startedAt: Date.now(),
    });
  },
});

export const markOkTraceInternal = internalMutation({
  args: {
    runId: v.id("generationRuns"),
    outputPreview: v.optional(v.string()),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    episodeId: v.optional(v.id("episodes")),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      status: "ok",
      finishedAt: Date.now(),
    };
    if (args.outputPreview !== undefined) patch.outputPreview = args.outputPreview;
    if (args.tokensIn !== undefined) patch.tokensIn = args.tokensIn;
    if (args.tokensOut !== undefined) patch.tokensOut = args.tokensOut;
    if (args.costUsd !== undefined) patch.costUsd = args.costUsd;
    if (args.latencyMs !== undefined) patch.latencyMs = args.latencyMs;
    if (args.episodeId !== undefined) patch.episodeId = args.episodeId;
    await ctx.db.patch(args.runId, patch);
  },
});

export const markErrorTraceInternal = internalMutation({
  args: {
    runId: v.id("generationRuns"),
    errorMessage: v.string(),
    latencyMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      status: "error",
      errorMessage: args.errorMessage.slice(0, 1000),
      finishedAt: Date.now(),
    };
    if (args.latencyMs !== undefined) patch.latencyMs = args.latencyMs;
    await ctx.db.patch(args.runId, patch);
  },
});

// /app/runs: list root-level runs for the signed-in user (parentRunId absent).
// Each row is the top of a trace tree the UI can expand.
export const listRoots = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const limit = args.limit ?? 50;
    const rows = await ctx.db
      .query("generationRuns")
      .withIndex("by_userToken", (q) => q.eq("userTokenId", identity.tokenIdentifier))
      .order("desc")
      .take(limit * 4);
    return rows.filter((r) => r.parentRunId === undefined).slice(0, limit);
  },
});

// /app/runs detail: list all child runs (recursive collapse: 1 level here,
// the UI walks parent links to render the tree).
export const listChildren = query({
  args: { parentRunId: v.id("generationRuns") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const rows = await ctx.db
      .query("generationRuns")
      .withIndex("by_parent", (q) => q.eq("parentRunId", args.parentRunId))
      .order("asc")
      .collect();
    return rows.filter((r) => r.userTokenId === identity.tokenIdentifier);
  },
});

// CLI/smoke-only: dump all runs for a given userTokenId, ordered.
export const listByTokenInternal = internalQuery({
  args: { userTokenId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("generationRuns")
      .withIndex("by_userToken", (q) => q.eq("userTokenId", args.userTokenId))
      .order("desc")
      .take(100);
  },
});

export const getOne = query({
  args: { runId: v.id("generationRuns") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const row = await ctx.db.get(args.runId);
    if (!row || row.userTokenId !== identity.tokenIdentifier) return null;
    return row;
  },
});
