# poc 5 — e2e smoke runs

full chain: **poc 2 (rss fetch) → poc 1 (dialogue gen) → poc 4 (tts render) → single mp3**. poc 3 folded into poc 1 per decision doc — the megaprompt selects topics itself.

## run 001 — 2026-04-25

- **feed**: https://noahpinion.substack.com/feed (first item)
- **source title**: "Is China's soft power really rising, or is America's just crumbling?"
- **word count in**: 3351
- **prompt version**: `v1-2026-04-24`
- **model**: `claude-sonnet-4-6`

### output
- **episode title**: "China's Rise or America's Fall?"
- **topics**: 2 (both with FACT → CHALLENGE → SYNTHESIS via the 4-subtopic template)
- **turns**: 26
- **ids**: `sourceId=kd7900ykkw2qs251fdv5ea3edn85f2j1` / `runId=k977r9re3sneajyghdmr3w46m585en21` / `episodeId=k574nx5kxsdhh7v4j48m87y39185fwyf`

### timings
- dialogue generate wall: **45.1s** (anthropic round-trip + parse + writes)
- fetch + source-insert: sub-second (not separately logged — shell capture truncated)

### cost (estimate)
- input ≈ 5000 tokens (article + prompt) → $0.015
- output ≈ 2700 tokens (26 turns × ~100 avg) → $0.040
- **total per episode ≈ $0.055**

### rubric spot-check
- schema: 2 topics × 4 subtopics in required order ✓
- anchor pushback: "but is that really new, or are we dressing up the same thing?" — direct ✓
- kalam synthesis: "the wave won't be manufactured — if it comes, it will come from the gaps" — earned, not platitude ✓
- coherence: both topics pull the same sovereignty/censorship thread ✓
- valid json: parsed + validated + inserted ✓
- **5/5 on 1 longer (3.3k word) input**. consistent with poc 1 smoke on 550-word input.

### open issue
- fetch of noahpinion feed worked but other feeds return html entities (`&#8217;` etc.) per poc 2 follow-up note. not hit this run but will bite when we expand the test set.

## run 002 — 2026-04-25 (full e2e — gap closed)

- **feed**: https://noahpinion.substack.com/feed (same source as run 001; second generation so episode differs)
- **word count in**: ~3300
- **prompt version**: `v1-2026-04-24`
- **voice config version**: `v1-2026-04-25` (poc 4 lock)

### output
- **turns**: 25 (KALAM=13, ANCHOR=12)
- **audio**: `poc/audio_samples/e2e_2026-04-24T19-29-13.mp3` — 5.77 MB · **360.7s ≈ 6 min**
- **ids**: captured in run doc, re-fetchable via `episodes:listMine` for `userTokenId=poc5-smoke`

### timings
| stage | ms |
|---|---|
| fetch (rss) | 770 |
| createSource (convex) | 2829 |
| generate (anthropic sonnet-4-6) | 48886 |
| fetchEpisode (convex) | 2784 |
| tts (elevenlabs, 25 calls) | 46637 |
| **total wall** | **101906** |

### per-voice TTS
- KALAM (turbo_v2_5): 9594ms / 13 turns = **738ms avg/turn**
- ANCHOR (v3):         37039ms / 12 turns = **3086ms avg/turn** (~4x slower — expected, v3 is the expressive model)

### render ratio
- tts wall / audio length: 46.6s / 360.7s = **0.13x**. budget was ≤2x; comfortably under.
- serial TTS dominates e2e. parallelizing per-turn could cut ~30s off wall.

### cost (estimate)
- anthropic: ~5k in + ~3k out = **~$0.06**
- elevenlabs: 5628 chars. mixed-model (13 turbo_v2_5 @ low cost + 12 v3 @ higher cost). ballpark **~$0.15-0.25** depending on plan.
- **per-episode total ≈ $0.20-0.30**

### pass/fail
- schema + anchor pushes + kalam synthesis + coherence + json: **5/5** (same as run 001)
- audio file plays end-to-end, ~6 min runtime ≥ 30-sec clip requirement ✓
- no per-turn TTS failure ✓
- render ratio ≤ 2x ✓
- **phase 0 gate for poc 5: passed**

## architecture notes surfaced for phase 1

- **serial TTS is the long pole** — 46s of the 102s total. `convex/pipeline/renderAudio.ts` should render turns in parallel (bounded concurrency, e.g. 5 at a time) to hit ~20s.
- **two ID3 headers in `Buffer.concat` output** — poc 4 flagged it. smoke plays fine in browsers/finder but phase 1 should use `ffmpeg-static` for a single clean frame.
- **voice config duplication risk** — smoke duplicates VOICES const from `poc/04-tts-smoke.ts`. centralize into a shared module (`convex/pipeline/voices.ts`?) that both phase 1 `renderAudio.ts` and any smoke scripts import.
- **error atomicity** — if TTS fails mid-render, we've already charged anthropic. phase 1 should persist intermediate state (e.g. `generationRuns.audioStatus`) and allow resumption from partial renders.
- **episode.dialogue already validated at insert** — TTS step can trust shape without re-validating. good separation.

## follow-ups (leftover)

- [ ] 2nd e2e run with a shorter feed (bariweiss ~819 words) — does the prompt still pick 2 topics on thin article?
- [ ] 3rd e2e run with a long feed (astralcodexten ~6k words) — quality + cost at long input?
- [ ] decode html entities in rss output before feeding to claude (poc 2 follow-up still open)
- [ ] rotate `ANTHROPIC_API_KEY` + `ELEVENLABS_API_KEY` (both chat-exposed)
