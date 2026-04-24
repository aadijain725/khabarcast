import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) throw new Error("ELEVENLABS_API_KEY missing. source .env.local first.");

const VOICES = {
  KALAM: {
    id: "oBcjxOGlStndvN2pZJ6V",
    model: "eleven_turbo_v2_5",
    settings: { stability: 0.55, similarity_boost: 0.80, style: 0.20, use_speaker_boost: true },
  },
  ANCHOR: {
    id: "8WqHCYyrnUqoK70Px5EJ",
    model: "eleven_v3",
    settings: { stability: 0.35, similarity_boost: 0.75, style: 0.55, use_speaker_boost: true },
  },
} as const;

type Turn = { speaker: keyof typeof VOICES; text: string };

const samples: Array<{ file: string; turns: Turn[] }> = [
  {
    file: "smoke_1_kalam_solo.mp3",
    turns: [{
      speaker: "KALAM",
      text: "When we look at the semiconductor mission, we are not only building chips. We are building the confidence of a young nation that is learning to shape its own future.",
    }],
  },
  {
    file: "smoke_2_anchor_solo.mp3",
    turns: [{
      speaker: "ANCHOR",
      text: "But here is what no one is saying. Subsidies on this scale have failed in three other countries. Why would the outcome in India look any different?",
    }],
  },
  {
    file: "smoke_3_pair_anchor_kalam.mp3",
    turns: [
      { speaker: "ANCHOR", text: "Everyone claims this is a generational bet. Isn't that just wishful thinking dressed up as policy?" },
      { speaker: "KALAM",  text: "A generational bet is not a guarantee. It is a commitment. The honest answer is that we will only know in ten years, and the work of those ten years is what we should be talking about today." },
    ],
  },
];

async function synth(turn: Turn): Promise<{ buf: Buffer; ms: number; bytes: number }> {
  const v = VOICES[turn.speaker];
  const t0 = Date.now();
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v.id}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": API_KEY!, "Content-Type": "application/json", "Accept": "audio/mpeg" },
    body: JSON.stringify({ text: turn.text, model_id: v.model, voice_settings: v.settings }),
  });
  if (!res.ok) throw new Error(`TTS ${turn.speaker} ${res.status}: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, ms: Date.now() - t0, bytes: buf.length };
}

async function main() {
  const outDir = resolve(process.cwd(), "poc/audio_samples");
  for (const sample of samples) {
    const chunks: Buffer[] = [];
    let totalMs = 0;
    for (const turn of sample.turns) {
      const { buf, ms, bytes } = await synth(turn);
      chunks.push(buf);
      totalMs += ms;
      console.log(`  ${turn.speaker}: ${ms}ms, ${bytes} bytes, "${turn.text.slice(0, 60)}..."`);
    }
    const out = Buffer.concat(chunks);
    const path = resolve(outDir, sample.file);
    await writeFile(path, out);
    const audioSec = out.length / (128_000 / 8);
    const ratio = (totalMs / 1000 / audioSec).toFixed(2);
    console.log(`wrote ${sample.file}  render=${totalMs}ms  audio≈${audioSec.toFixed(1)}s  ratio=${ratio}x (budget ≤2x)`);
    console.log("");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
