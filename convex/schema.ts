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
    // phase 4 (MAAS): which host record fills each speaker slot for this episode.
    // Optional for backward compat with phase-1/2 episodes that pre-date hosts table.
    hostMapping: v.optional(
      v.object({
        KALAM: v.id("hosts"),
        ANCHOR: v.id("hosts"),
      }),
    ),
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
    // phase 4: optional (was required). curator + manager runs have no sourceId
    // until research completes. existing phase-1 rows always have it set.
    sourceId: v.optional(v.id("sources")),
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
    // phase 4 (MAAS): trace fields. all optional so phase-1/2 rows still validate.
    // step = which agent in the org wrote this row (manager, curator, researcher,
    // ideology, composer, voice). agentName = specific instance ("ideology-kalam").
    // parentRunId chains rows into a trace tree for /app/runs.
    step: v.optional(v.string()),
    agentName: v.optional(v.string()),
    parentRunId: v.optional(v.id("generationRuns")),
    inputPreview: v.optional(v.string()),
    outputPreview: v.optional(v.string()),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
  })
    .index("by_userToken", ["userTokenId"])
    .index("by_source", ["sourceId"])
    .index("by_parent", ["parentRunId"]),

  // phase 4 (MAAS): personality + voice config for each host the user can pick.
  // ownerTokenId = null for global preset hosts (KALAM, ANCHOR seeds). Set to
  // userTokenId for hosts a user added via /app/hosts. slot = which dialogue
  // speaker slot this host fills.
  hosts: defineTable({
    ownerTokenId: v.optional(v.string()),
    slot: v.union(v.literal("KALAM"), v.literal("ANCHOR")),
    name: v.string(),
    voiceId: v.string(),
    voiceModel: v.optional(v.string()),
    voiceParams: v.optional(
      v.object({
        stability: v.number(),
        similarity_boost: v.number(),
        style: v.number(),
        use_speaker_boost: v.optional(v.boolean()),
      }),
    ),
    ideologyPrompt: v.string(),
    persona: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerTokenId"])
    .index("by_slot", ["slot"]),

  // phase 4 (MAAS): user-curated topic preferences. weight rises on positive
  // topicFlags + explicit "more like this" feedback, falls on negative flags.
  // source tracks where this topic came from (onboarding bootstrap, post-ep
  // feedback, cross-user trending picks, manual entry).
  userTopics: defineTable({
    userTokenId: v.string(),
    topic: v.string(),
    weight: v.number(),
    source: v.union(
      v.literal("onboarding"),
      v.literal("feedback"),
      v.literal("trending"),
      v.literal("manual"),
    ),
    lastReinforcedAt: v.number(),
  })
    .index("by_userToken", ["userTokenId"])
    .index("by_userToken_topic", ["userTokenId", "topic"]),

  // phase 4 (MAAS): newsletter feeds the user follows. kind picks which
  // connector handles fetchLatest. handle is the connector-specific identifier
  // (substack username, full RSS URL, or feedly category slug).
  userFeeds: defineTable({
    userTokenId: v.string(),
    kind: v.union(
      v.literal("substack"),
      v.literal("rss"),
      v.literal("feedly"),
    ),
    handle: v.string(),
    title: v.optional(v.string()),
    addedAt: v.number(),
  }).index("by_userToken", ["userTokenId"]),
});
