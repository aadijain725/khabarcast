import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// phase 4 (MAAS): host table = personality + voice config records that fill the
// dialogue's KALAM/ANCHOR speaker slots. ownerTokenId absent = global preset
// (visible to all users). Set = user-owned (visible only to that user).

const SLOT = v.union(v.literal("KALAM"), v.literal("ANCHOR"));

const VOICE_PARAMS = v.object({
  stability: v.number(),
  similarity_boost: v.number(),
  style: v.number(),
  use_speaker_boost: v.optional(v.boolean()),
});

// Global + user-owned hosts visible to the signed-in user, ordered newest-first.
export const listVisible = query({
  args: {},
  handler: async (ctx): Promise<Doc<"hosts">[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const globals = await ctx.db
      .query("hosts")
      .withIndex("by_owner", (q) => q.eq("ownerTokenId", undefined))
      .collect();
    const owned = await ctx.db
      .query("hosts")
      .withIndex("by_owner", (q) => q.eq("ownerTokenId", identity.tokenIdentifier))
      .collect();
    return [...globals, ...owned].sort((a, b) => b._creationTime - a._creationTime);
  },
});

// CLI/smoke helper — list all global hosts (no auth, returns slot + name + id).
export const listGlobalsInternal = internalQuery({
  args: {},
  handler: async (ctx): Promise<Doc<"hosts">[]> => {
    return await ctx.db
      .query("hosts")
      .withIndex("by_owner", (q) => q.eq("ownerTokenId", undefined))
      .collect();
  },
});

// Internal lookup used by agent code. Returns host if global (ownerTokenId
// undefined) or owned by the supplied userTokenId; throws otherwise.
export const getOwnedOrGlobalInternal = internalQuery({
  args: {
    hostId: v.id("hosts"),
    userTokenId: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"hosts">> => {
    const row = await ctx.db.get(args.hostId);
    if (!row) throw new Error("host not found");
    if (row.ownerTokenId !== undefined && row.ownerTokenId !== args.userTokenId) {
      throw new Error("host not accessible");
    }
    return row;
  },
});

// User-facing create (auth-wrapped). For now, slot is required — future
// migration to N speakers will widen this.
export const create = mutation({
  args: {
    slot: SLOT,
    name: v.string(),
    voiceId: v.string(),
    voiceModel: v.optional(v.string()),
    voiceParams: v.optional(VOICE_PARAMS),
    ideologyPrompt: v.string(),
    persona: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"hosts">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("not authenticated");
    return await ctx.db.insert("hosts", {
      ownerTokenId: identity.tokenIdentifier,
      slot: args.slot,
      name: args.name,
      voiceId: args.voiceId,
      voiceModel: args.voiceModel,
      voiceParams: args.voiceParams,
      ideologyPrompt: args.ideologyPrompt,
      persona: args.persona,
      createdAt: Date.now(),
    });
  },
});

// Seed the two global preset hosts (KALAM, ANCHOR) if missing. Idempotent —
// safe to run on every deploy. Lifts ideology prompts + voice config from the
// existing locked POC values so phase-1/2 episodes stay consistent.
export const seedDefaultsInternal = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ created: string[] }> => {
    const created: string[] = [];

    const existing = await ctx.db
      .query("hosts")
      .withIndex("by_owner", (q) => q.eq("ownerTokenId", undefined))
      .collect();

    const has = (slot: "KALAM" | "ANCHOR", name: string) =>
      existing.some((h) => h.slot === slot && h.name === name);

    if (!has("KALAM", "Kalam-inspired")) {
      await ctx.db.insert("hosts", {
        ownerTokenId: undefined,
        slot: "KALAM",
        name: "Kalam-inspired",
        voiceId: "oBcjxOGlStndvN2pZJ6V",
        voiceModel: "eleven_turbo_v2_5",
        voiceParams: {
          stability: 0.55,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true,
        },
        persona:
          "Calm, wise, optimistic, systems-minded. Inspired by APJ Abdul Kalam — persona-inspired, not impersonation.",
        ideologyPrompt:
          "Tone: calm, wise, optimistic, systems-minded. Lens: science, youth, innovation, long-term human and national progress, self-reliance. Job: synthesize facts into meaning. Connect specific developments to bigger human or national threads. Every topic ends with a constructive takeaway. Don't moralize; earn the wisdom through specifics.",
        createdAt: Date.now(),
      });
      created.push("Kalam-inspired");
    }

    if (!has("ANCHOR", "Skeptical Anchor")) {
      await ctx.db.insert("hosts", {
        ownerTokenId: undefined,
        slot: "ANCHOR",
        name: "Skeptical Anchor",
        voiceId: "8WqHCYyrnUqoK70Px5EJ",
        voiceModel: "eleven_v3",
        voiceParams: {
          stability: 0.35,
          similarity_boost: 0.75,
          style: 0.55,
          use_speaker_boost: true,
        },
        persona:
          "Sharp, urgent, skeptical, media-savvy. Inspired by a high-energy Indian news anchor style — persona-inspired, not impersonation.",
        ideologyPrompt:
          "Tone: sharp, urgent, skeptical, media-savvy. Lens: what matters now, what's being missed, where's the controversy. Job: create friction. Push back at least once per topic with a real counter-argument. Use phrases like 'but isn't that naive?', 'who loses here?', 'is that really new, or are we dressing up the same thing?'. Prevent the episode from becoming a soft summary.",
        createdAt: Date.now(),
      });
      created.push("Skeptical Anchor");
    }

    return { created };
  },
});
