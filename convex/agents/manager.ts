"use node";

// phase 4 (MAAS): MANAGER agent. Top-level intent router. Two public actions:
//
// - `onboard` — runs curator bootstrap; returns feeds + topic suggestions
//   for the UI. Does NOT commit (UI commits after user selects).
//
// - `generateEpisode` — runs the full pipeline:
//     researcher → composer (which spawns ideology agents) → renderAudio.
//   Each step is a child run of the manager's root run, so the trace tree
//   on /app/runs shows the full hierarchy.
//
// The manager step itself does not call claude — it's a pure router. Its
// trace row exists so the UI can render the run as a single tree rooted at
// the user's intent. tokensIn/Out/cost stay at 0 for the manager row.

import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalAction, ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { withTrace } from "./lib/runLog";
import {
  doCuratorBootstrap,
  doCuratorFromTopics,
  CuratorBootstrapResult,
  CuratorFromTopicsResult,
} from "./curator";
import { doResearch } from "./researcher";
import { doCompose } from "./composer";
import { doRender } from "../pipeline/renderAudio";

const PROMPT_VERSION = "manager-v1-2026-04-25";
const MODEL = "manager";
const RESEARCHER_FEED_LIMIT = 5;

type GenerateEpisodeResult = {
  rootRunId: Id<"generationRuns">;
  sourceId: Id<"sources">;
  episodeId: Id<"episodes">;
  audioFileId?: Id<"_storage">;
  audioDurationSec?: number;
};

// ----- shared helpers (called from both auth-wrapped + internal variants) -----

export async function doOnboard(
  ctx: ActionCtx,
  params: { userTokenId: string; feedLines: string[] },
): Promise<CuratorBootstrapResult> {
  const { output } = await withTrace(
    ctx,
    {
      userTokenId: params.userTokenId,
      step: "manager",
      agentName: "manager:onboard",
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      input: { lineCount: params.feedLines.length },
    },
    async (managerRunId) => {
      const result = await doCuratorBootstrap(ctx, {
        userTokenId: params.userTokenId,
        feedLines: params.feedLines,
        parentRunId: managerRunId,
      });
      return {
        output: result,
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
      };
    },
  );

  return output.output as CuratorBootstrapResult;
}

export async function doSuggestFromTopics(
  ctx: ActionCtx,
  params: { userTokenId: string; topics: string[] },
): Promise<CuratorFromTopicsResult> {
  const { output } = await withTrace(
    ctx,
    {
      userTokenId: params.userTokenId,
      step: "manager",
      agentName: "manager:suggestFromTopics",
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      input: { topicCount: params.topics.length },
    },
    async (managerRunId) => {
      const result = await doCuratorFromTopics(ctx, {
        userTokenId: params.userTokenId,
        topics: params.topics,
        parentRunId: managerRunId,
      });
      return {
        output: result,
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
      };
    },
  );

  return output.output as CuratorFromTopicsResult;
}

export async function doGenerateEpisode(
  ctx: ActionCtx,
  params: {
    userTokenId: string;
    kalamHostId: Id<"hosts">;
    anchorHostId: Id<"hosts">;
  },
): Promise<GenerateEpisodeResult> {
  const { runId: managerRunId, output } = await withTrace(
    ctx,
    {
      userTokenId: params.userTokenId,
      step: "manager",
      agentName: "manager:generateEpisode",
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      input: {
        kalamHostId: params.kalamHostId,
        anchorHostId: params.anchorHostId,
      },
    },
    async (parentRunId) => {
      // 1. Researcher picks the source. Its withTrace ties it to the manager.
      const research = await doResearch(ctx, {
        userTokenId: params.userTokenId,
        parentRunId,
        feedLimit: RESEARCHER_FEED_LIMIT,
      });

      // 2. Composer fans out to ideology agents in parallel, then weaves
      //    the dialogue and persists the episode row.
      const compose = await doCompose(ctx, {
        sourceId: research.sourceId,
        userTokenId: params.userTokenId,
        hostMapping: {
          KALAM: params.kalamHostId,
          ANCHOR: params.anchorHostId,
        },
        parentRunId,
      });

      // 3. Audio rendering. Wrapped in try-catch — TTS rate limits and
      //    transient API errors are common, but the episode is still valid
      //    without audio. The user can re-trigger renderAudio:runInternal
      //    later. We log to console so the failure is visible in convex logs;
      //    renderAudio's own error mutation has already marked the episode's
      //    audioStatus = "error" with details.
      let audioFileId: Id<"_storage"> | undefined;
      let audioDurationSec: number | undefined;
      try {
        const render = await doRender(ctx, {
          episodeId: compose.episodeId,
          userTokenId: params.userTokenId,
          parentRunId,
        });
        audioFileId = render.audioFileId;
        audioDurationSec = render.audioDurationSec;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `manager.generateEpisode: audio render failed for episode ${compose.episodeId}: ${message}. Episode row remains valid; user can retry.`,
        );
      }

      return {
        output: {
          sourceId: research.sourceId,
          episodeId: compose.episodeId,
          audioFileId,
          audioDurationSec,
        },
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
        episodeId: compose.episodeId,
      };
    },
  );

  const inner = output.output as {
    sourceId: Id<"sources">;
    episodeId: Id<"episodes">;
    audioFileId?: Id<"_storage">;
    audioDurationSec?: number;
  };

  return {
    rootRunId: managerRunId,
    sourceId: inner.sourceId,
    episodeId: inner.episodeId,
    audioFileId: inner.audioFileId,
    audioDurationSec: inner.audioDurationSec,
  };
}

// Regenerate from an existing episode's source with a NEW host pair. Produces
// a NEW episode row (old one is preserved in history). Composer pulls fresh
// ideologies for whichever hosts the user picked.
export async function doRegenerateEpisode(
  ctx: ActionCtx,
  params: {
    userTokenId: string;
    fromEpisodeId: Id<"episodes">;
    kalamHostId: Id<"hosts">;
    anchorHostId: Id<"hosts">;
  },
): Promise<GenerateEpisodeResult> {
  const old = await ctx.runQuery(internal.episodes.getInternal, {
    episodeId: params.fromEpisodeId,
  });
  if (!old) throw new Error("source episode not found");
  if (old.userTokenId !== params.userTokenId) throw new Error("not owner");
  const sourceId = old.sourceId;

  const { runId: managerRunId, output } = await withTrace(
    ctx,
    {
      userTokenId: params.userTokenId,
      sourceId,
      step: "manager",
      agentName: "manager:regenerateEpisode",
      model: MODEL,
      promptVersion: PROMPT_VERSION,
      input: {
        fromEpisodeId: params.fromEpisodeId,
        kalamHostId: params.kalamHostId,
        anchorHostId: params.anchorHostId,
      },
    },
    async (parentRunId) => {
      const compose = await doCompose(ctx, {
        sourceId,
        userTokenId: params.userTokenId,
        hostMapping: {
          KALAM: params.kalamHostId,
          ANCHOR: params.anchorHostId,
        },
        parentRunId,
      });

      let audioFileId: Id<"_storage"> | undefined;
      let audioDurationSec: number | undefined;
      try {
        const render = await doRender(ctx, {
          episodeId: compose.episodeId,
          userTokenId: params.userTokenId,
          parentRunId,
        });
        audioFileId = render.audioFileId;
        audioDurationSec = render.audioDurationSec;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `manager.regenerateEpisode: audio render failed for episode ${compose.episodeId}: ${message}.`,
        );
      }

      return {
        output: {
          sourceId,
          episodeId: compose.episodeId,
          audioFileId,
          audioDurationSec,
        },
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
        episodeId: compose.episodeId,
      };
    },
  );

  const inner = output.output as {
    sourceId: Id<"sources">;
    episodeId: Id<"episodes">;
    audioFileId?: Id<"_storage">;
    audioDurationSec?: number;
  };

  return {
    rootRunId: managerRunId,
    sourceId: inner.sourceId,
    episodeId: inner.episodeId,
    audioFileId: inner.audioFileId,
    audioDurationSec: inner.audioDurationSec,
  };
}

// ----- public auth-wrapped actions -----

export const onboard = action({
  args: {
    feedLines: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<CuratorBootstrapResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    return await doOnboard(ctx, {
      userTokenId: userId,
      feedLines: args.feedLines,
    });
  },
});

export const suggestFromTopics = action({
  args: {
    topics: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<CuratorFromTopicsResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    return await doSuggestFromTopics(ctx, {
      userTokenId: userId,
      topics: args.topics,
    });
  },
});

export const generateEpisode = action({
  args: {
    kalamHostId: v.id("hosts"),
    anchorHostId: v.id("hosts"),
  },
  handler: async (ctx, args): Promise<GenerateEpisodeResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    return await doGenerateEpisode(ctx, {
      userTokenId: userId,
      kalamHostId: args.kalamHostId,
      anchorHostId: args.anchorHostId,
    });
  },
});

export const regenerateEpisode = action({
  args: {
    fromEpisodeId: v.id("episodes"),
    kalamHostId: v.id("hosts"),
    anchorHostId: v.id("hosts"),
  },
  handler: async (ctx, args): Promise<GenerateEpisodeResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("not authenticated");
    return await doRegenerateEpisode(ctx, {
      userTokenId: userId,
      fromEpisodeId: args.fromEpisodeId,
      kalamHostId: args.kalamHostId,
      anchorHostId: args.anchorHostId,
    });
  },
});

// ----- internal CLI smoke variants (skip auth) -----

export const onboardInternal = internalAction({
  args: {
    userTokenId: v.string(),
    feedLines: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<CuratorBootstrapResult> => {
    return await doOnboard(ctx, {
      userTokenId: args.userTokenId,
      feedLines: args.feedLines,
    });
  },
});

export const generateEpisodeInternal = internalAction({
  args: {
    userTokenId: v.string(),
    kalamHostId: v.id("hosts"),
    anchorHostId: v.id("hosts"),
  },
  handler: async (ctx, args): Promise<GenerateEpisodeResult> => {
    return await doGenerateEpisode(ctx, {
      userTokenId: args.userTokenId,
      kalamHostId: args.kalamHostId,
      anchorHostId: args.anchorHostId,
    });
  },
});
