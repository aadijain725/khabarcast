import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) throw new Error("ELEVENLABS_API_KEY missing. set -a && source .env.local && set +a");

const ANCHOR_ID = "8WqHCYyrnUqoK70Px5EJ";
const TEXT =
  "But here is what no one is saying. Subsidies on this scale have failed in three other countries. Why would the outcome in India look any different?";

const variants = [
  {
    file: "anchor_A_multilingual_v2.mp3",
    model: "eleven_multilingual_v2",
    settings: { stability: 0.35, similarity_boost: 0.75, style: 0.55, use_speaker_boost: true },
  },
  {
    file: "anchor_B_turbo_v2_5_pushed.mp3",
    model: "eleven_turbo_v2_5",
    settings: { stability: 0.20, similarity_boost: 0.75, style: 0.85, use_speaker_boost: true },
  },
  {
    file: "anchor_C_v3.mp3",
    model: "eleven_v3",
    settings: { stability: 0.35, similarity_boost: 0.75, style: 0.55, use_speaker_boost: true },
  },
] as const;

async function synth(v: typeof variants[number]) {
  const t0 = Date.now();
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ANCHOR_ID}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": API_KEY!, "Content-Type": "application/json", "Accept": "audio/mpeg" },
    body: JSON.stringify({ text: TEXT, model_id: v.model, voice_settings: v.settings }),
  });
  if (!res.ok) throw new Error(`${v.file} ${res.status}: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ms = Date.now() - t0;
  await writeFile(resolve(process.cwd(), "poc/audio_samples", v.file), buf);
  const sec = buf.length / (128_000 / 8);
  return { file: v.file, model: v.model, ms, bytes: buf.length, sec };
}

async function main() {
  const results = await Promise.all(variants.map(synth));
  for (const r of results) {
    console.log(`${r.file}  model=${r.model}  render=${r.ms}ms  audio≈${r.sec.toFixed(1)}s`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
