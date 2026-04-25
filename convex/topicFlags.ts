import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "./_generated/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

const kindValidator = v.union(
  v.literal("good"),
  v.literal("bad"),
  v.literal("too-long"),
  v.literal("off-topic"),
);

// Helper: verify caller owns the episode being flagged. Returns the user id.
async function verifyEpisodeOwner(
  ctx: QueryCtx | MutationCtx,
  episodeId: Id<"episodes">,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("not authenticated");
  const episode = await ctx.db.get(episodeId);
  if (!episode) throw new Error("episode not found");
  if (episode.userTokenId !== userId) throw new Error("not owner");
  return userId;
}

export const createFlag = mutation({
  args: {
    episodeId: v.id("episodes"),
    topicIndex: v.number(),
    kind: kindValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"topicFlags">> => {
    const userTokenId = await verifyEpisodeOwner(ctx, args.episodeId);
    if (args.topicIndex < 0) throw new Error("topicIndex must be >= 0");
    return await ctx.db.insert("topicFlags", {
      userTokenId,
      episodeId: args.episodeId,
      topicIndex: args.topicIndex,
      kind: args.kind,
      note: args.note,
    });
  },
});

export const listForEpisode = query({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, args): Promise<Array<Doc<"topicFlags">>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const episode = await ctx.db.get(args.episodeId);
    if (!episode) return [];
    if (episode.userTokenId !== userId) return [];
    return await ctx.db
      .query("topicFlags")
      .withIndex("by_episode", (q) => q.eq("episodeId", args.episodeId))
      .order("desc")
      .take(50);
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx): Promise<Array<Doc<"topicFlags">>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("topicFlags")
      .withIndex("by_userToken", (q) => q.eq("userTokenId", userId))
      .order("desc")
      .take(100);
  },
});

// phase 4 (MAAS): curator-feedback agent reads flags for a single episode to
// translate them into userTopics weight deltas. Owner check happens here so the
// action layer can stay thin.
export const listForEpisodeInternal = internalQuery({
  args: { episodeId: v.id("episodes"), userTokenId: v.string() },
  handler: async (ctx, args): Promise<Array<Doc<"topicFlags">>> => {
    const episode = await ctx.db.get(args.episodeId);
    if (!episode) return [];
    if (episode.userTokenId !== args.userTokenId) return [];
    return await ctx.db
      .query("topicFlags")
      .withIndex("by_episode", (q) => q.eq("episodeId", args.episodeId))
      .collect();
  },
});

export const createInternal = internalMutation({
  args: {
    userTokenId: v.string(),
    episodeId: v.id("episodes"),
    topicIndex: v.number(),
    kind: kindValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"topicFlags">> => {
    return await ctx.db.insert("topicFlags", {
      userTokenId: args.userTokenId,
      episodeId: args.episodeId,
      topicIndex: args.topicIndex,
      kind: args.kind,
      note: args.note,
    });
  },
});
