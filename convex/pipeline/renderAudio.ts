"use node";

import { v } from "convex/values";
import { action, internalAction, ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import {
  getVoices,
  VOICE_CONFIG_VERSION,
  MP3_OUTPUT_FORMAT,
  MP3_BYTES_PER_SECOND,
  Speaker,
} from "./voices";

// ElevenLabs starter tier allows max 3 concurrent requests. Serial for now —
// poc 5 confirmed render ratio ~0.13x even serial, so parallelism isn't on
// the critical path. Bump when upgrading the plan.
const TTS_CONCURRENCY = 1;

type Turn = { speaker: Speaker; text: string };

function flattenTurns(dialogue: {
  topics: Array<{ subtopics: Array<{ turns: Turn[] }> }>;
}): Turn[] {
  return dialogue.topics.flatMap((t) => t.subtopics.flatMap((s) => s.turns));
}

async function synthTurn(apiKey: string, turn: Turn): Promise<ArrayBuffer> {
  const voices = getVoices();
  const v = voices[turn.speaker];

  const maxAttempts = 4;
  let lastError = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${v.id}?output_format=${MP3_OUTPUT_FORMAT}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: turn.text,
          model_id: v.model,
          voice_settings: v.settings,
        }),
      },
    );
    if (res.ok) return await res.arrayBuffer();

    lastError = `${res.status}: ${(await res.text()).slice(0, 200)}`;
    // Retry on 429 (rate/concurrency) and 5xx. Fail fast on 4xx auth/input.
    if (res.status !== 429 && res.status < 500) {
      throw new Error(`TTS ${turn.speaker} ${lastError}`);
    }
    if (attempt < maxAttempts) {
      const backoffMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw new Error(`TTS ${turn.speaker} after ${maxAttempts} attempts: ${lastError}`);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIdx = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const myIdx = nextIdx++;
      if (myIdx >= items.length) return;
      results[myIdx] = await fn(items[myIdx], myIdx);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function doRender(
  ctx: ActionCtx,
  params: { episodeId: Id<"episodes">; userTokenId: string },
): Promise<{ audioFileId: Id<"_storage">; audioDurationSec: number }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set on convex deployment");

  const episode = await ctx.runQuery(internal.episodes.getInternal, {
    episodeId: params.episodeId,
  });
  if (!episode) throw new Error("episode not found");
  if (episode.userTokenId !== params.userTokenId) throw new Error("not owner");

  await ctx.runMutation(internal.episodes.setAudioRenderingInternal, {
    episodeId: params.episodeId,
    voiceConfigVersion: VOICE_CONFIG_VERSION,
  });

  try {
    const turns = flattenTurns(episode.dialogue);
    const buffers = await mapWithConcurrency(
      turns,
      TTS_CONCURRENCY,
      async (turn) => await synthTurn(apiKey, turn),
    );

    // Concatenate into a single mp3. Known caveat (poc 4 note): two ID3 headers
    // in the output — lenient decoders accept it. ffmpeg-static cleanup is a
    // follow-up when it matters.
    const totalBytes = buffers.reduce((n, b) => n + b.byteLength, 0);
    const combined = new Uint8Array(totalBytes);
    let offset = 0;
    for (const b of buffers) {
      combined.set(new Uint8Array(b), offset);
      offset += b.byteLength;
    }

    const blob = new Blob([combined], { type: "audio/mpeg" });
    const audioFileId: Id<"_storage"> = await ctx.storage.store(blob);
    const audioDurationSec = totalBytes / MP3_BYTES_PER_SECOND;

    await ctx.runMutation(internal.episodes.setAudioReadyInternal, {
      episodeId: params.episodeId,
      audioFileId,
      audioDurationSec,
    });

    return { audioFileId, audioDurationSec };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.runMutation(internal.episodes.setAudioErrorInternal, {
      episodeId: params.episodeId,
      audioError: message,
    });
    throw err;
  }
}

export const run = action({
  args: { episodeId: v.id("episodes") },
  handler: async (
    ctx,
    args,
  ): Promise<{ audioFileId: Id<"_storage">; audioDurationSec: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("not authenticated");
    return await doRender(ctx, {
      episodeId: args.episodeId,
      userTokenId: identity.tokenIdentifier,
    });
  },
});

export const runInternal = internalAction({
  args: {
    episodeId: v.id("episodes"),
    userTokenId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ audioFileId: Id<"_storage">; audioDurationSec: number }> => {
    return await doRender(ctx, args);
  },
});
