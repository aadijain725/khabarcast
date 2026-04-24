import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const create = mutation({
  args: {
    title: v.string(),
    rawText: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"sources">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("not authenticated");

    const title = args.title.trim();
    const rawText = args.rawText.trim();
    if (!title) throw new Error("title required");
    if (!rawText) throw new Error("rawText required");

    return await ctx.db.insert("sources", {
      userTokenId: identity.tokenIdentifier,
      title,
      rawText,
      url: args.url,
      wordCount: countWords(rawText),
    });
  },
});

// Test-only: create a source with explicit userTokenId (no auth). Also usable
// by future orchestrator flows that resolve the user out-of-band.
export const createInternal = internalMutation({
  args: {
    userTokenId: v.string(),
    title: v.string(),
    rawText: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"sources">> => {
    const title = args.title.trim();
    const rawText = args.rawText.trim();
    if (!title) throw new Error("title required");
    if (!rawText) throw new Error("rawText required");
    return await ctx.db.insert("sources", {
      userTokenId: args.userTokenId,
      title,
      rawText,
      url: args.url,
      wordCount: countWords(rawText),
    });
  },
});

export const getOwnedInternal = internalQuery({
  args: {
    sourceId: v.id("sources"),
    userTokenId: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"sources">> => {
    const row = await ctx.db.get(args.sourceId);
    if (!row) throw new Error("source not found");
    if (row.userTokenId !== args.userTokenId) throw new Error("not owner");
    return row;
  },
});
