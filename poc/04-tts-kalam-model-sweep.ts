import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) throw new Error("ELEVENLABS_API_KEY missing. set -a && source .env.local && set +a");

const KALAM_ID = "oBcjxOGlStndvN2pZJ6V";
const TEXT =
  "When we look at the semiconductor mission, we are not only building chips. We are building the confidence of a young nation that is learning to shape its own future.";

const variants = [
  {
    file: "kalam_A_v3.mp3",
    model: "eleven_v3",
    settings: { stability: 0.55, similarity_boost: 0.80, style: 0.20, use_speaker_boost: true },
  },
  {
    file: "kalam_B_turbo_v2_5.mp3",
    model: "eleven_turbo_v2_5",
    settings: { stability: 0.55, similarity_boost: 0.80, style: 0.20, use_speaker_boost: true },
  },
  {
    file: "kalam_C_multilingual_v2_high_sim.mp3",
    model: "eleven_multilingual_v2",
    settings: { stability: 0.55, similarity_boost: 0.95, style: 0.20, use_speaker_boost: true },
  },
] as const;

async function synth(v: typeof variants[number]) {
  const t0 = Date.now();
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${KALAM_ID}?output_format=mp3_44100_128`, {
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
    console.log(`${r.file}  model=${r.model}  render=${r.ms}ms  audio≈${r.sec.toFixed(1)}s  bytes=${r.bytes}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
