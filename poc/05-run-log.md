# poc 5 — e2e smoke runs

partial chain: **poc 2 (rss fetch) → poc 1 (dialogue gen)**. poc 3 (topic selector) skipped — the megaprompt picks its own topics from raw article. poc 4 (tts) not built yet, so no audio rendering.

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

## gap to full e2e

needs:
- **poc 4 (tts)**: convert 26 turns × 2 speakers → audio stream. elevenlabs + voice-per-speaker + stitching.
- **poc 3 (topic selector) decision**: current dialogue quality on 3.3k word input is good; selector may be unnecessary overhead. re-evaluate after 3-5 more runs across article types.

## next runs

- [ ] 2nd run with a shorter feed (bariweiss ~819 words) — does the prompt still pick 2 topics, or does it strain?
- [ ] 3rd run with a very long feed (astralcodexten ~6k words) — dialogue quality at long input?
- [ ] after poc 4 lands: re-run this chain with TTS enabled, measure total e2e wall + audio file size
