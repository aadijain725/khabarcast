import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const turn = v.object({
  speaker: v.union(v.literal("KALAM"), v.literal("ANCHOR")),
  text: v.string(),
});

const subtopic = v.object({
  label: v.union(
    v.literal("core facts"),
    v.literal("why it matters"),
    v.literal("challenge"),
    v.literal("constructive takeaway"),
  ),
  turns: v.array(turn),
});

const topic = v.object({
  title: v.string(),
  subtopics: v.array(subtopic),
});

export const dialogueValidator = v.object({
  episode_title: v.string(),
  source_title: v.string(),
  topics: v.array(topic),
});

export default defineSchema({
  ...authTables,

  waitlist: defineTable({
    email: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  sources: defineTable({
    userTokenId: v.string(),
    title: v.string(),
    rawText: v.string(),
    url: v.optional(v.string()),
    wordCount: v.number(),
  }).index("by_userToken", ["userTokenId"]),

  episodes: defineTable({
    userTokenId: v.string(),
    sourceId: v.id("sources"),
    runId: v.id("generationRuns"),
    episodeTitle: v.string(),
    sourceTitle: v.string(),
    dialogue: dialogueValidator,
    promptVersion: v.string(),
    // Audio render state. Absent = never rendered. Populated by renderAudio.
    audioStatus: v.optional(
      v.union(
        v.literal("rendering"),
        v.literal("ready"),
        v.literal("error"),
      ),
    ),
    audioFileId: v.optional(v.id("_storage")),
    audioDurationSec: v.optional(v.number()),
    audioError: v.optional(v.string()),
    voiceConfigVersion: v.optional(v.string()),
  })
    .index("by_userToken", ["userTokenId"])
    .index("by_source", ["sourceId"]),

  topicFlags: defineTable({
    userTokenId: v.string(),
    episodeId: v.id("episodes"),
    topicIndex: v.number(),
    kind: v.union(
      v.literal("good"),
      v.literal("bad"),
      v.literal("too-long"),
      v.literal("off-topic"),
    ),
    note: v.optional(v.string()),
  })
    .index("by_episode", ["episodeId"])
    .index("by_userToken", ["userTokenId"]),

  generationRuns: defineTable({
    userTokenId: v.string(),
    sourceId: v.id("sources"),
    episodeId: v.optional(v.id("episodes")),
    status: v.union(
      v.literal("pending"),
      v.literal("ok"),
      v.literal("error"),
    ),
    model: v.string(),
    promptVersion: v.string(),
    errorMessage: v.optional(v.string()),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
  })
    .index("by_userToken", ["userTokenId"])
    .index("by_source", ["sourceId"]),
});
