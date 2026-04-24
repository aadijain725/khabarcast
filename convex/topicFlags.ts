import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

const kindValidator = v.union(
  v.literal("good"),
  v.literal("bad"),
  v.literal("too-long"),
  v.literal("off-topic"),
);

// Helper: verify caller owns the episode being flagged. Returns userTokenId.
async function verifyEpisodeOwner(
  ctx: { auth: { getUserIdentity(): Promise<{ tokenIdentifier: string } | null> }; db: { get: (id: Id<"episodes">) => Promise<Doc<"episodes"> | null> } },
  episodeId: Id<"episodes">,
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("not authenticated");
  const episode = await ctx.db.get(episodeId);
  if (!episode) throw new Error("episode not found");
  if (episode.userTokenId !== identity.tokenIdentifier) throw new Error("not owner");
  return identity.tokenIdentifier;
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const episode = await ctx.db.get(args.episodeId);
    if (!episode) return [];
    if (episode.userTokenId !== identity.tokenIdentifier) return [];
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("topicFlags")
      .withIndex("by_userToken", (q) =>
        q.eq("userTokenId", identity.tokenIdentifier),
      )
      .order("desc")
      .take(100);
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
