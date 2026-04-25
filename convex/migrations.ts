import { internalMutation } from "./_generated/server";

// One-shot migration (2026-04-25). Rewrites every `userTokenId` /
// `ownerTokenId` that was stored in the legacy `@convex-dev/auth`
// `${issuer}|${userId}|${sessionId}` format to the stable users-table
// document id (the second `|` segment).
//
// Why: until today the codebase keyed ownership on `identity.tokenIdentifier`,
// which @convex-dev/auth derives from `subject = "${userId}|${sessionId}"`.
// Every login mints a new sessionId, so on the next login the legacy token
// no longer matched anything and `listMine` queries returned empty. Data was
// not lost — it was unreachable. Switching to `getAuthUserId(ctx)` (returns
// just the userId) is the fix; this mutation rewrites historical rows so they
// remain owned by the same user post-migration.
//
// Idempotent: rows already in the new format (no leading "http") are skipped.
// Safe to run multiple times. Delete this file once verified on prod.

function legacyToUserId(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (!value.startsWith("http")) return value; // already migrated
  const parts = value.split("|");
  // Expected layout: "${issuer}|${userId}|${sessionId}". userId = parts[1].
  if (parts.length < 2 || !parts[1]) return value;
  return parts[1];
}

export const migrateTokenIdsToUserIdsInternal = internalMutation({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    sources: number;
    episodes: number;
    userFeeds: number;
    userTopics: number;
    topicFlags: number;
    generationRuns: number;
    hosts: number;
  }> => {
    let sources = 0;
    for (const r of await ctx.db.query("sources").collect()) {
      const next = legacyToUserId(r.userTokenId);
      if (next !== undefined && next !== r.userTokenId) {
        await ctx.db.patch(r._id, { userTokenId: next });
        sources++;
      }
    }

    let episodes = 0;
    for (const r of await ctx.db.query("episodes").collect()) {
      const next = legacyToUserId(r.userTokenId);
      if (next !== undefined && next !== r.userTokenId) {
        await ctx.db.patch(r._id, { userTokenId: next });
        episodes++;
      }
    }

    let userFeeds = 0;
    for (const r of await ctx.db.query("userFeeds").collect()) {
      const next = legacyToUserId(r.userTokenId);
      if (next !== undefined && next !== r.userTokenId) {
        await ctx.db.patch(r._id, { userTokenId: next });
        userFeeds++;
      }
    }

    let userTopics = 0;
    for (const r of await ctx.db.query("userTopics").collect()) {
      const next = legacyToUserId(r.userTokenId);
      if (next !== undefined && next !== r.userTokenId) {
        await ctx.db.patch(r._id, { userTokenId: next });
        userTopics++;
      }
    }

    let topicFlags = 0;
    for (const r of await ctx.db.query("topicFlags").collect()) {
      const next = legacyToUserId(r.userTokenId);
      if (next !== undefined && next !== r.userTokenId) {
        await ctx.db.patch(r._id, { userTokenId: next });
        topicFlags++;
      }
    }

    let generationRuns = 0;
    for (const r of await ctx.db.query("generationRuns").collect()) {
      const next = legacyToUserId(r.userTokenId);
      if (next !== undefined && next !== r.userTokenId) {
        await ctx.db.patch(r._id, { userTokenId: next });
        generationRuns++;
      }
    }

    let hosts = 0;
    for (const r of await ctx.db.query("hosts").collect()) {
      // ownerTokenId is optional (undefined for globals).
      if (r.ownerTokenId === undefined) continue;
      const next = legacyToUserId(r.ownerTokenId);
      if (next !== undefined && next !== r.ownerTokenId) {
        await ctx.db.patch(r._id, { ownerTokenId: next });
        hosts++;
      }
    }

    return {
      sources,
      episodes,
      userFeeds,
      userTopics,
      topicFlags,
      generationRuns,
      hosts,
    };
  },
});
