# poc 4 — tts voice config (locked)

status: **locked** (2026-04-25) — a/b chosen: kalam = turbo_v2_5 (picked B over multilingual_v2 / v3 for indian accent + clean pronunciation); anchor = eleven_v3 (picked C over multilingual_v2 / turbo-pushed for natural intonation). smoke samples under `poc/audio_samples/smoke_*.mp3`.

version id: `v1-2026-04-25`. bump when voice ids, model ids, or settings change.

---

## voices

| role | voice id | source | category |
|---|---|---|---|
| `KALAM` | `oBcjxOGlStndvN2pZJ6V` | user-cloned (in user's library) | `cloned` |
| `ANCHOR` | `8WqHCYyrnUqoK70Px5EJ` | shared library → added 2026-04-25 as "Nitin - Indian Accent with emotions" | `professional` |

kalam-voice context: see `~/.claude/projects/-Users-aadijain/memory/project_khabarcast_kalam_voice_clone.md` — cloned real-figure voice, risks acknowledged by user.

## per-voice model + settings

```ts
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
```

output format: `mp3_44100_128` (44.1kHz mp3, 128kbps).

## why per-voice model (not one shared)

- `eleven_multilingual_v2` (the default starting point): good expressiveness, but neutralized kalam's indian accent → felt generic.
- `eleven_turbo_v2_5`: preserved kalam's accent + cleaner english pronunciation. but when applied to anchor, flattened intonation → anchor lost its sharp/urgent quality.
- `eleven_v3`: most expressive model, restored anchor's intonation, handles emotion well. overkill for kalam (whose target is calm/measured), where turbo's restraint is a feature.

mixing models across voices is safe — turns render independently then concatenate. listener hears two distinct speakers regardless.

## smoke results (2026-04-25 locked run)

| file | turns | model(s) | render ms | audio sec | ratio |
|---|---|---|---|---|---|
| `smoke_1_kalam_solo.mp3` | 1 | turbo_v2_5 | 561 | 8.6 | 0.07x |
| `smoke_2_anchor_solo.mp3` | 1 | v3 | 3278 | 8.1 | 0.41x |
| `smoke_3_pair_anchor_kalam.mp3` | 2 | v3 + turbo_v2_5 | 2148 | 15.3 | 0.14x |

budget was ≤2x audio length. all comfortably under.

## pass/fail (per plan)

- [x] 2-sec distinguishability: user picked both voices after a/b listen.
- [x] pace contrast (anchor sharp/urgent vs kalam calm): confirmed by model selection — v3 preserves anchor intonation, turbo_v2_5 keeps kalam measured.
- [x] no obvious clipping / mispronunciation: turbo_v2_5 fixed kalam's pronunciation issue on multilingual_v2.
- [x] latency ≤ 2x audio length: 0.07–0.41x, pass.

## cost napkin (unchanged from draft)

4 episodes × 5 min × $0.30/min ≈ **$6/month** at paid tier. free tier = ~10 min/month on `multilingual_v2`. `eleven_v3` and `turbo_v2_5` have different character multipliers — check your dashboard usage tab after first real episode.

## concatenation caveat

smoke `Buffer.concat` of two mp3 streams produces a file with two ID3 headers. plays in finder/browsers (lenient decoders). for phase 1 `renderAudio.ts` use `ffmpeg-static` or stream-level concat for a single clean ID3 frame.

## follow-ups for phase 1 (`convex/pipeline/renderAudio.ts`)

- convex env (dev + prod): `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_KALAM=oBcjxOGlStndvN2pZJ6V`, `ELEVENLABS_VOICE_ANCHOR=8WqHCYyrnUqoK70Px5EJ`.
- store per-voice model + settings in a shared const the action imports — same pattern as the poc 1 prompt (single source of truth).
- proper mp3 concat strategy (ffmpeg-static recommended).
- rotate `ELEVENLABS_API_KEY` — pasted in chat during poc 4 smoke.
- api key scope currently missing `voices: write` — expand if future automation needs to add shared voices programmatically (today we did it manually via UI).
- investigate `eleven_v3` character cost vs `turbo_v2_5` — v3 is more expensive; may want turbo for both voices once mp3 concat is doing more of the expressive work.
