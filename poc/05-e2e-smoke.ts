/**
 * poc 5 — end-to-end smoke (full chain).
 *
 * poc 2 (rss fetch) → poc 1 (dialogue gen) → poc 4 (tts render) → single mp3.
 * poc 3 (topic selector) folded into poc 1 per decision doc — no separate step.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx poc/05-e2e-smoke.ts <feed-url>
 *
 * Writes:
 *   poc/audio_samples/e2e_<timestamp>.mp3
 */

import Parser from "rss-parser";
import { execSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const USER_TOKEN = "poc5-smoke";
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_KEY) throw new Error("ELEVENLABS_API_KEY missing — source .env.local first");

// Voice config locked in poc/04-voice-config.md (v1-2026-04-25). Duplicated
// here for smoke; centralized in convex/pipeline/renderAudio.ts during phase 1.
const VOICES = {
  KALAM: {
    id: "oBcjxOGlStndvN2pZJ6V",
    model: "eleven_turbo_v2_5",
    settings: { stability: 0.55, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
  },
  ANCHOR: {
    id: "8WqHCYyrnUqoK70Px5EJ",
    model: "eleven_v3",
    settings: { stability: 0.35, similarity_boost: 0.75, style: 0.55, use_speaker_boost: true },
  },
} as const;

type Speaker = keyof typeof VOICES;
type Turn = { speaker: Speaker; text: string };

function runConvex(fn: string, args: Record<string, unknown>): unknown {
  const argsJson = JSON.stringify(args);
  const quoted = `'${argsJson.replace(/'/g, `'\\''`)}'`;
  const out = execSync(`npx convex run ${fn} ${quoted}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  const trimmed = out.trim();
  return trimmed ? JSON.parse(trimmed) : null;
}

async function synthTurn(turn: Turn): Promise<{ buf: Buffer; ms: number }> {
  const v = VOICES[turn.speaker];
  const t0 = Date.now();
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${v.id}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_KEY!,
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
  if (!res.ok) {
    throw new Error(`TTS ${turn.speaker} ${res.status}: ${await res.text()}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, ms: Date.now() - t0 };
}

function flattenTurns(dialogue: {
  topics: Array<{ subtopics: Array<{ turns: Turn[] }> }>;
}): Turn[] {
  return dialogue.topics.flatMap((t) => t.subtopics.flatMap((s) => s.turns));
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("usage: npx tsx poc/05-e2e-smoke.ts <feed-url>");
    process.exit(1);
  }

  const stage: Record<string, number> = {};

  // ── poc 2: fetch RSS ──────────────────────────────────────────────
  let t = Date.now();
  const feed = await new Parser().parseURL(url);
  const item = feed.items[0];
  if (!item) throw new Error("feed has no items");
  const html =
    ((item as unknown as Record<string, string>)["content:encoded"] ||
      item.content ||
      "") as string;
  const cleanText = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = cleanText.split(/\s+/).length;
  stage.fetchMs = Date.now() - t;
  if (wordCount < 300) throw new Error(`article too thin: ${wordCount} words`);
  console.log(`[fetch]    "${item.title}" — ${wordCount} words — ${stage.fetchMs}ms`);

  // ── convex: create source ─────────────────────────────────────────
  t = Date.now();
  const sourceId = runConvex("sources:createInternal", {
    userTokenId: USER_TOKEN,
    title: item.title ?? "untitled",
    rawText: cleanText,
    url: item.link,
  }) as string;
  stage.createSourceMs = Date.now() - t;
  console.log(`[source]   ${sourceId} — ${stage.createSourceMs}ms`);

  // ── poc 1: generate dialogue ──────────────────────────────────────
  t = Date.now();
  const { runId, episodeId } = runConvex("pipeline/generateScript:runInternal", {
    sourceId,
    userTokenId: USER_TOKEN,
  }) as { runId: string; episodeId: string };
  stage.generateMs = Date.now() - t;
  console.log(`[generate] run=${runId} episode=${episodeId} — ${stage.generateMs}ms`);

  // ── fetch episode ─────────────────────────────────────────────────
  t = Date.now();
  const episode = runConvex("episodes:getInternal", { episodeId }) as {
    dialogue: {
      episode_title: string;
      topics: Array<{ subtopics: Array<{ turns: Turn[] }> }>;
    };
    promptVersion: string;
  };
  stage.fetchEpisodeMs = Date.now() - t;
  const turns = flattenTurns(episode.dialogue);
  console.log(`[episode]  "${episode.dialogue.episode_title}" — ${turns.length} turns`);

  // ── poc 4: TTS render, per-voice model ────────────────────────────
  t = Date.now();
  const chunks: Buffer[] = [];
  let totalChars = 0;
  const perVoice: Record<Speaker, { ms: number; count: number }> = {
    KALAM: { ms: 0, count: 0 },
    ANCHOR: { ms: 0, count: 0 },
  };
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const { buf, ms } = await synthTurn(turn);
    chunks.push(buf);
    perVoice[turn.speaker].ms += ms;
    perVoice[turn.speaker].count += 1;
    totalChars += turn.text.length;
    process.stdout.write(`  ${String(i + 1).padStart(2)}/${turns.length} ${turn.speaker.padEnd(6)} ${ms}ms\n`);
  }
  stage.ttsMs = Date.now() - t;

  // ── write file ────────────────────────────────────────────────────
  const outDir = resolve(process.cwd(), "poc/audio_samples");
  await mkdir(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = resolve(outDir, `e2e_${ts}.mp3`);
  const audio = Buffer.concat(chunks);
  await writeFile(outPath, audio);
  const audioSec = audio.length / (128_000 / 8);

  // ── summary ───────────────────────────────────────────────────────
  const totalMs = Object.values(stage).reduce((a, b) => a + b, 0);
  console.log("");
  console.log("═══ E2E SUMMARY ═══");
  console.log(`source:         ${item.title}`);
  console.log(`episode:        ${episode.dialogue.episode_title}`);
  console.log(`prompt version: ${episode.promptVersion}`);
  console.log(`turns:          ${turns.length}  (KALAM=${perVoice.KALAM.count}, ANCHOR=${perVoice.ANCHOR.count})`);
  console.log(`characters:     ${totalChars}`);
  console.log(`stage timings:`);
  for (const [k, v] of Object.entries(stage)) console.log(`  ${k.padEnd(18)} ${v}ms`);
  console.log(`tts per-voice:`);
  console.log(`  KALAM            ${perVoice.KALAM.ms}ms over ${perVoice.KALAM.count} turns`);
  console.log(`  ANCHOR           ${perVoice.ANCHOR.ms}ms over ${perVoice.ANCHOR.count} turns`);
  console.log(`total wall:     ${totalMs}ms`);
  console.log(`audio:          ${outPath}`);
  console.log(`audio size:     ${audio.length} bytes  (≈ ${audioSec.toFixed(1)}s)`);
  console.log(`render ratio:   ${(stage.ttsMs / 1000 / audioSec).toFixed(2)}x audio length`);
}

main().catch((e) => {
  console.error("[error]", e instanceof Error ? e.message : e);
  process.exit(1);
});
