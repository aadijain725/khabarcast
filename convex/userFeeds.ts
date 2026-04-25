import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// phase 4 (MAAS): newsletter feeds the user follows. Curator populates these
// on onboarding (substack profile scrape). Researcher reads them and dispatches
// to the matching connector by `kind`.

const KIND = v.union(
  v.literal("substack"),
  v.literal("rss"),
  v.literal("feedly"),
);

export const listMine = query({
  args: {},
  handler: async (ctx): Promise<Doc<"userFeeds">[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("userFeeds")
      .withIndex("by_userToken", (q) => q.eq("userTokenId", userId))
      .order("desc")
      .collect();
  },
});

export const listMineInternal = internalQuery({
  args: { userTokenId: v.string() },
  handler: async (ctx, args): Promise<Doc<"userFeeds">[]> => {
    return await ctx.db
      .query("userFeeds")
      .withIndex("by_userToken", (q) => q.eq("userTokenId", args.userTokenId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    kind: KIND,
    handle: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"userFeeds">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const handle = args.handle.trim();
    if (!handle) throw new Error("handle required");
    return await ctx.db.insert("userFeeds", {
      userTokenId: userId,
      kind: args.kind,
      handle,
      title: args.title,
      addedAt: Date.now(),
    });
  },
});

export const addInternal = internalMutation({
  args: {
    userTokenId: v.string(),
    kind: KIND,
    handle: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"userFeeds">> => {
    const handle = args.handle.trim();
    if (!handle) throw new Error("handle required");
    // Idempotent: skip duplicates by (userTokenId, kind, handle).
    const existing = await ctx.db
      .query("userFeeds")
      .withIndex("by_userToken", (q) => q.eq("userTokenId", args.userTokenId))
      .collect();
    const dup = existing.find((r) => r.kind === args.kind && r.handle === handle);
    if (dup) return dup._id;
    return await ctx.db.insert("userFeeds", {
      userTokenId: args.userTokenId,
      kind: args.kind,
      handle,
      title: args.title,
      addedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { feedId: v.id("userFeeds") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const row = await ctx.db.get(args.feedId);
    if (!row) return;
    if (row.userTokenId !== userId) throw new Error("not owner");
    await ctx.db.delete(args.feedId);
  },
});
