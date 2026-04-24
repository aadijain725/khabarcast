# khabarcast v1 — todo

plan: `~/.claude/plans/gentle-painting-bumblebee.md`

prior phase (auth: google oauth + magic link, landing, waitlist) — **done**. see git log: `62f1b3b` + `aaf4f04`.

## phase 0 — pocs (claude chat, not code)

### poc 1 — two-host dialogue (brain)
- [x] source article used: 550-word semiconductor mission piece (saved inline in poc1 smoke, not to `poc/source_N.txt` — smoke was CLI-run, not claude-chat-run)
- [x] apply pass/fail tests: **5/5 pass** — schema valid, anchor pushes ≥ 1/topic, kalam synthesizes (not textbook), coherence across topics, valid json
- [x] lock final prompt at `poc/01-final-prompt.md` (version `v1-2026-04-24`)
- note: poc 1 was run programmatically (via the convex action + anthropic sonnet-4-6) rather than pasted into claude chat. the prompt the action uses = the prompt in the md file, verbatim.

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
- [x] poc 1 passed
- [x] poc 2 passed
- [ ] poc 4 passed
- [ ] poc 3 decision logged

## phase 1 — schema + pipeline (convex, backend-first)

partial delivery landed with poc 1 merge. remaining items listed below.

- [x] read `convex/_generated/ai/guidelines.md` (overrides training data)
- [ ] read relevant docs in `node_modules/next/dist/docs/` (next 16 breaking changes)
- [x] `convex/schema.ts`: sources, episodes, generationRuns + indexes — **topicFlags still TODO**
- [x] install deps: `@anthropic-ai/sdk` (poc 1), `rss-parser` (poc 2)
- [x] convex env: `ANTHROPIC_API_KEY` (dev) — still TODO: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_KALAM`, `ELEVENLABS_VOICE_ANCHOR`, prod keys
- [ ] `convex/pipeline/fetchSource.ts` (action) — wrap poc 2 script as a convex action, write result to `sources` table
- [ ] `convex/pipeline/selectTopics.ts` (action) — or skip per poc 3 decision
- [x] `convex/pipeline/generateScript.ts` (action) — locked poc 1 prompt, smoke-verified
- [ ] `convex/pipeline/renderAudio.ts` (action) — elevenlabs + convex file storage
- [ ] `convex/pipeline/orchestrate.ts` (action) — hardcoded handoffs
- [x] `convex/episodes.ts` — `get` + `listMine` (public) + `getInternal` + `insertFromRunInternal`. note: no top-level `generate` mutation — generation is driven by `pipeline/generateScript:run` action instead.
- [ ] `convex/topicFlags.ts` — create/listMine
- [x] local test: `pipeline/generateScript:runInternal` via `npx convex run` completes end-to-end

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

### poc 1 + poc 2 + partial phase 1 landing (2026-04-24)

**what changed**
- poc 2: `poc/02-fetch-rss.ts` — rss-parser, 5/5 substack feeds, text ≥ 500 words on each. follow-up: html entity decode before claude.
- poc 1: prompt locked as `poc/01-final-prompt.md` (version `v1-2026-04-24`). same text lives verbatim inside `convex/pipeline/generateScript.ts`; bump `PROMPT_VERSION` when the text changes.
- schema: `sources`, `episodes`, `generationRuns` tables + `dialogueValidator` exported from `schema.ts` (topic/subtopic/turn union literals enforced at insert).
- ownership: `userTokenId` (= `identity.tokenIdentifier` per convex guidelines) stamped on every row; queries filter by it.
- action flow: auth → load owned source → create run (pending) → anthropic `claude-sonnet-4-6` → strip fences → JSON.parse → shape-validate → insert episode → mark run ok. error path marks run error with first 1000 chars.
- refactor: core flow extracted to `doGenerate(ctx, {sourceId, userTokenId})`; public `run` (auth-wrapped) and `runInternal` (no auth, trusted caller) both use it. `runInternal` + `sources.createInternal` + `episodes.getInternal` will be the orchestrator's surface later.

**decisions**
- sourceId in, not raw text — shape stable for the future rss→generate handoff.
- prompt duplicated between md + ts. actions can't read repo files at runtime; sync enforced by version-bump discipline.
- `claude-sonnet-4-6`. opus overkill at this stage.

**surprises**
- `npx convex codegen` pushed fns to the dev deployment (not just local type generation). additive schema, no risk, but flag if someone reverts convex/ on a branch.
- worktree (`khabarcast-poc1-script`) didn't inherit untracked `poc/` or `.env.local` — copied manually.
- npm cache perm bug (lessons.md) hit again; `--cache /tmp/...` workaround.
- smoke duration: 31s wall, ~$0.05 per episode (sonnet 4.6, ~4k in + 2k out).

**next**
- rotate `ANTHROPIC_API_KEY` (was pasted in chat during poc 1 smoke).
- set `ANTHROPIC_API_KEY` on prod deployment when ready to ship.
- poc 4 (tts) + poc 3 (topic selector decision) to clear phase 0 gate.
- delete/archive the `khabarcast-poc1-script` worktree once this merge is confirmed green.
