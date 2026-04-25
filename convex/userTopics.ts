import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// phase 4 (MAAS): user-curated topic preferences. Curator writes these on
// onboarding (source="onboarding") and on post-episode feedback
// (source="feedback"). Researcher reads them, ranking articles by weight.

const SOURCE = v.union(
  v.literal("onboarding"),
  v.literal("feedback"),
  v.literal("trending"),
  v.literal("manual"),
);

const DEFAULT_WEIGHT = 1;

export const listMine = query({
  args: {},
  handler: async (ctx): Promise<Doc<"userTopics">[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("userTopics")
      .withIndex("by_userToken", (q) => q.eq("userTokenId", userId))
      .collect();
  },
});

export const listMineInternal = internalQuery({
  args: { userTokenId: v.string() },
  handler: async (ctx, args): Promise<Doc<"userTopics">[]> => {
    return await ctx.db
      .query("userTopics")
      .withIndex("by_userToken", (q) => q.eq("userTokenId", args.userTokenId))
      .collect();
  },
});

// Upsert by (userTokenId, topic). Increments weight on existing rows by
// `delta` (default +1) and touches lastReinforcedAt. Used by curator on
// positive feedback / "more like this" buttons.
export const upsert = mutation({
  args: {
    topic: v.string(),
    delta: v.optional(v.number()),
    source: SOURCE,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const topic = args.topic.trim();
    if (!topic) throw new Error("topic required");
    const delta = args.delta ?? 1;
    const existing = await ctx.db
      .query("userTopics")
      .withIndex("by_userToken_topic", (q) =>
        q.eq("userTokenId", userId).eq("topic", topic),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        weight: existing.weight + delta,
        lastReinforcedAt: Date.now(),
        source: args.source,
      });
      return existing._id;
    }
    return await ctx.db.insert("userTopics", {
      userTokenId: userId,
      topic,
      weight: DEFAULT_WEIGHT + delta - 1,
      source: args.source,
      lastReinforcedAt: Date.now(),
    });
  },
});

export const upsertInternal = internalMutation({
  args: {
    userTokenId: v.string(),
    topic: v.string(),
    delta: v.optional(v.number()),
    source: SOURCE,
  },
  handler: async (ctx, args) => {
    const topic = args.topic.trim();
    if (!topic) throw new Error("topic required");
    const delta = args.delta ?? 1;
    const existing = await ctx.db
      .query("userTopics")
      .withIndex("by_userToken_topic", (q) =>
        q.eq("userTokenId", args.userTokenId).eq("topic", topic),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        weight: existing.weight + delta,
        lastReinforcedAt: Date.now(),
        source: args.source,
      });
      return existing._id;
    }
    return await ctx.db.insert("userTopics", {
      userTokenId: args.userTokenId,
      topic,
      weight: DEFAULT_WEIGHT + delta - 1,
      source: args.source,
      lastReinforcedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { topicId: v.id("userTopics") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    const row = await ctx.db.get(args.topicId);
    if (!row) return;
    if (row.userTokenId !== userId) throw new Error("not owner");
    await ctx.db.delete(args.topicId);
  },
});
