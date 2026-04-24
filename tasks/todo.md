# khabarcast v1 — todo

plan: `~/.claude/plans/gentle-painting-bumblebee.md`

prior phase (auth: google oauth + magic link, landing, waitlist) — **done**. see git log: `62f1b3b` + `aaf4f04`.

## phase 0 — pocs (claude chat, not code)

### poc 1 — two-host dialogue (brain)
- [ ] pick 3 source articles (1 tech, 1 news/policy, 1 science). save full text to `poc/source_1.txt`, `poc/source_2.txt`, `poc/source_3.txt`
- [ ] paste `poc/01-dialogue-megaprompt.md` into claude chat with source 1. save output to `poc/run_01_source_1.json`
- [ ] repeat for source 2, source 3
- [ ] apply pass/fail tests from plan (anchor push ≥ 1/topic, kalam synthesizes, coherence, valid json)
- [ ] iterate prompt until 2 of 3 sources pass. lock final prompt at `poc/01-final-prompt.md`

### poc 2 — rss fetching
- [x] collect 5 substack urls — astralcodexten, noahpinion, bariweiss, mattstoller, slowboring
- [x] ~~`curl <url>/feed` each, eyeball xml~~ skipped — rss-parser output confirmed valid xml parse
- [x] 10-line node script using `rss-parser`, extract `{title, cleanText, publishedAt}` from first item
- [x] run against 5 urls, verify ≥ 4 work + text ≥ 500 words — **5/5 pass**, words: 6395/3351/819/963/4381
- [x] save working script to `poc/02-fetch-rss.ts`
- [ ] follow-up for pipeline phase: decode html entities (`&#8217;` etc.) before feeding to claude

### poc 3 — topic selector (decision fork)
- [ ] topic picker prompt, run against 3 articles from poc 2
- [ ] smoke test: do topics improve poc 1 output vs raw article dump?
- [ ] log decision in `poc/03-topic-selector-decision.md` — keep separate step or fold into poc 1

### poc 4 — tts (elevenlabs)
- [ ] sign up elevenlabs free tier
- [ ] pick 2 voice ids (kalam warm/reflective, anchor sharp/urgent)
- [ ] synthesize 3 sample turns via api or playground. save mp3s to `poc/audio_samples/`
- [ ] a/b listen: voices distinguishable in 2 sec?
- [ ] tune stability/similarity/style params per voice
- [ ] lock voice ids + param presets in `poc/04-voice-config.md`

### poc 5 — end-to-end smoke (optional, recommended)
- [ ] manually chain poc 2 → poc 3 → poc 1 → poc 4 with one article
- [ ] record 30-sec audio clip
- [ ] note total human effort + api cost

### phase 0 gate
- [ ] poc 1, 2, 4 passed. poc 3 decision logged. only then proceed to phase 1.

## phase 1 — schema + pipeline (convex, backend-first)

- [ ] read `convex/_generated/ai/guidelines.md` (overrides training data)
- [ ] read relevant docs in `node_modules/next/dist/docs/` (next 16 breaking changes)
- [ ] update `convex/schema.ts`: sources, episodes, topicFlags, generationRuns + indexes
- [ ] install deps: `@anthropic-ai/sdk`, `rss-parser`
- [ ] set convex env: `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_KALAM`, `ELEVENLABS_VOICE_ANCHOR`
- [ ] `convex/pipeline/fetchSource.ts` (action)
- [ ] `convex/pipeline/selectTopics.ts` (action) — or skip per poc 3 decision
- [ ] `convex/pipeline/generateScript.ts` (action) — locked poc 1 prompt
- [ ] `convex/pipeline/renderAudio.ts` (action) — elevenlabs + convex file storage
- [ ] `convex/pipeline/orchestrate.ts` (action) — hardcoded handoffs
- [ ] `convex/episodes.ts` — generate/get/listMine
- [ ] `convex/topicFlags.ts` — create/listMine
- [ ] local test: invoke `episodes.generate` via convex dashboard, full run completes

## phase 2 — ui (3 screens)

- [ ] `app/app/page.tsx` — generate screen (move `/dashboard` content here)
- [ ] `components/HostCard.tsx` — kalam + anchor preset
- [ ] `components/SourceInput.tsx` — url/paste tabs
- [ ] `app/app/episodes/[id]/page.tsx` — player + transcript
- [ ] `components/PodcastPlayer.tsx` — native `<audio>` + custom controls
- [ ] `components/TranscriptTurn.tsx` — turn + flag button
- [ ] `app/app/history/page.tsx` — episode list + flagged segments
- [ ] update `components/NavAuthButton.tsx` target to `/app`
- [ ] delete or redirect old `/dashboard` route

## phase 3 — tightening for l2 credibility

- [ ] retry button on failed episodes
- [ ] live status label driven by generationRuns subscription
- [ ] `/app/runs` admin view (env-flag gated)
- [ ] manual eval pass: 5 fresh episodes, note quality/failures in `tasks/lessons.md`
- [ ] update `README.md` with env vars + setup
- [ ] capture rubric evidence: screenshots of player, generationRuns table, loom of flow

## ship

- [ ] types pass (`npx tsc --noEmit`), lint pass, `npm run dev` smoke
- [ ] `git push origin main` → vercel auto-deploys (never `vercel --prod`)
- [ ] `npx convex deploy` for backend
- [ ] verify on live vercel url
- [ ] set prod envs: `vercel env add` + `npx convex env set --prod`

## review

_fill per phase: what changed, what surprised, what to revisit._
