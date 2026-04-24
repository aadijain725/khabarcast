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
- [x] topic picker prompt locked at `poc/03-topic-selector-prompt.md` (v0.1-2026-04-25)
- [x] run against 3 articles from poc 2 — `poc/topics_out/{astralcodexten,noahpinion,slowboring}.json`. 3/3 returned valid JSON, 3 topics each, sharp tensions
- [x] ~~smoke test: poc 1 raw vs with-topics~~ skipped — decision was lean-leaning; tie would still = fold. documented as v1 follow-up experiment in decision doc.
- [x] **decision: fold into poc 1** — logged in `poc/03-topic-selector-decision.md` with reversal trigger

### poc 4 — tts (elevenlabs)
- [x] sign up elevenlabs free tier + create api key `khabarcast-dev` (scopes: text_to_speech + voices read)
- [x] pick 2 voice ids — kalam: `oBcjxOGlStndvN2pZJ6V` (user clone), anchor: `8WqHCYyrnUqoK70Px5EJ` (Nitin shared voice, added 2026-04-25)
- [x] synthesize 3 sample turns via `poc/04-tts-smoke.ts`. mp3s in `poc/audio_samples/` (`smoke_1/2/3*.mp3`)
- [x] a/b listen: distinguishable — user picked kalam-B (turbo_v2_5) over multilingual_v2/v3, and anchor-C (eleven_v3) over multilingual_v2/turbo-pushed
- [x] tune per-voice params: kalam `{stability:0.55, sim:0.80, style:0.20}` on turbo_v2_5; anchor `{stability:0.35, sim:0.75, style:0.55}` on eleven_v3
- [x] lock voice ids + param presets in `poc/04-voice-config.md` (version `v1-2026-04-25`)

### poc 5 — end-to-end smoke (optional, recommended)
- [x] script chains poc 2 → poc 1 → poc 4 (poc 3 folded) in `poc/05-e2e-smoke.ts`
- [x] 30-sec clip requirement exceeded: 360.7s (6 min) audio on noahpinion feed
- [x] effort + cost logged in `poc/05-run-log.md` — 102s wall, ~$0.20-0.30/episode

### phase 0 gate
- [x] poc 1 passed
- [x] poc 2 passed
- [x] poc 4 passed (2026-04-25, voice config locked)
- [x] poc 3 decision logged — **fold into poc 1**
- [x] poc 5 passed (2026-04-25, full e2e with audio artifact) — **gate cleared, phase 1 unblocked**

## phase 1 — schema + pipeline (convex, backend-first)

partial delivery landed with poc 1 merge. remaining items listed below.

- [x] read `convex/_generated/ai/guidelines.md` (overrides training data)
- [ ] read relevant docs in `node_modules/next/dist/docs/` (next 16 breaking changes)
- [x] `convex/schema.ts`: sources, episodes, generationRuns, **topicFlags** + audio fields on episodes (`audioStatus`, `audioFileId`, `audioDurationSec`, `audioError`, `voiceConfigVersion`)
- [x] install deps: `@anthropic-ai/sdk` (poc 1), `rss-parser` (poc 2)
- [x] convex env: `ANTHROPIC_API_KEY` + `ELEVENLABS_API_KEY` on dev. still TODO: prod keys + `ELEVENLABS_VOICE_KALAM`/`ELEVENLABS_VOICE_ANCHOR` (optional; code has locked poc 4 defaults)
- [x] `convex/pipeline/voices.ts` — shared voice config const (`getVoices()`, `VOICE_CONFIG_VERSION`)
- [x] `convex/pipeline/fetchSource.ts` (action) — rss-parser + HTML entity decode, min 300 words, writes to `sources`
- [x] ~~`convex/pipeline/selectTopics.ts` (action)~~ — **skipped per poc 3 decision (fold into poc 1)**
- [x] `convex/pipeline/generateScript.ts` (action) — locked poc 1 prompt, smoke-verified
- [x] `convex/pipeline/renderAudio.ts` (action) — elevenlabs + `ctx.storage`. serial (concurrency=1) for starter-tier limit. 429/5xx retry with 1s/2s/4s backoff. patches episode with audio state.
- [x] `convex/pipeline/orchestrate.ts` (action) — fetchSource → generateScript → renderAudio, direct helper imports (no ctx.runAction rpc)
- [x] `convex/episodes.ts` — `get` + `listMine` (public) + `getInternal` + `insertFromRunInternal` + `setAudio{Rendering,Ready,Error}Internal`
- [x] `convex/topicFlags.ts` — `createFlag` / `listForEpisode` / `listMine` (all auth-wrapped) + `createInternal`
- [x] local test: `pipeline/orchestrate:runInternal` chain fails cleanly on 429 → `renderAudio:runInternal` resumes on same episode after backoff — audioStatus `error → rendering → ready` verified

## phase 2 — ui (3 screens)

- [x] `app/app/layout.tsx` — shared nav + footer for /app routes (wordmark, generate/history links, sign-out)
- [x] `app/app/page.tsx` — generate screen (hero headline + SourceInput + HostCardStack + history link)
- [x] `components/HostCard.tsx` — KALAM + ANCHOR preset cards, corner brackets
- [x] `components/SourceInput.tsx` — URL input + orchestrator action call + elapsed-time phase estimator (fetch → dialogue → tts phase labels based on smoke medians)
- [x] `app/app/episodes/[id]/page.tsx` — player + transcript by topic/subtopic + flag bar per topic
- [x] `components/PodcastPlayer.tsx` — hidden native `<audio>` + custom play/pause + seek slider + time formatter
- [x] `components/TranscriptTurn.tsx` — turn (role-aligned) + `TopicFlagBar` (good/bad/too-long/off-topic)
- [x] `app/app/history/page.tsx` — list of my episodes with audio status + duration + link to detail
- [x] `components/NavAuthButton.tsx` target: `/dashboard` → `/app`, label "DASHBOARD" → "OPEN APP"
- [x] `/dashboard` route: replaced with server `redirect("/app")` (auth gate kept so unauth'd users land on login first)
- [x] `proxy.ts`: protected routes updated to `/app`, `/app/(.*)`, `/dashboard`; authed `/login` redirects to `/app`
- [x] backend: `episodes.getWithAudioUrl` query joins episode doc + signed `ctx.storage.getUrl` output
- [x] route smoke: `/` + `/login` → 200, `/app` + `/app/history` + `/app/episodes/<id>` + `/dashboard` → 307 → `/login` (unauth'd path). Authed flow NOT interactively verified — needs browser login.

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

### phase 1 + phase 2 landing (2026-04-25)

**what changed**
- **phase 1 (backend pipeline)**: `convex/pipeline/{fetchSource,renderAudio,orchestrate}.ts` + `voices.ts` (shared config) + `topicFlags.ts`. Episodes gained audio lifecycle fields (`audioStatus`, `audioFileId`, `audioDurationSec`, `audioError`, `voiceConfigVersion`).
- **phase 2 (ui)**: three signed-in screens under `/app` (generate, episode detail, history) + player, transcript, flag components. `/dashboard` → server-redirect to `/app`. Proxy gating updated.
- **fetchSource pivot**: started with `rss-parser`, hit "Unexpected close tag" on astralcodexten and a user feed (sax chokes on inline HTML). Dropped rss-parser entirely, replaced with a ~30-line regex extractor (namespace-tolerant, CDATA-aware, Atom + RSS uniform). Verified across 18 real-world feeds — item extraction has a 100% hit rate on every feed tested; only failures are the word-count gate and 404s.
- **renderAudio error path proven**: first orchestrator run on phase 1 crashed mid-TTS with ElevenLabs 429 concurrent limit. Error handling set `audioStatus=error`, then `renderAudio:runInternal` re-invoked on the same episode (skipping anthropic re-spend) transitioned `error → rendering → ready`. This is the orchestrator resumability story in practice.

**decisions**
- ElevenLabs `TTS_CONCURRENCY=1` (starter tier allows 3 concurrent but the counter doesn't drain instantly; backoff retry 1s/2s/4s for 429+5xx makes it reliable).
- Helper-function composition (`doFetch`, `doGenerate`, `doRender`) over `ctx.runAction` for orchestrator — per convex same-runtime guideline + enables individual-step smoke testing.
- Phase 2 UI follows the art deco system from main's `7268544` rebrand (gold `#D4AF37`, Marcellus serif, `deco-*` helpers), NOT the stale `design.md` brutalist spec. `design.md` rewrite is a separate task.
- Diagnostic errors on fetchSource no-item: tells user explicitly when they pasted an HTML page, JSON, or an empty feed. Most common error in phase 2 smoke was exactly this.

**surprises**
- `npx convex codegen` doesn't reliably register new module files in nested dirs (`convex/pipeline/*`) — had to use `npx convex dev --once` to force deploy. Got a "Could not find function" error even though codegen said it uploaded.
- rss-parser's lenient xml2js mode (`{ strict: false, normalizeTags: true }`) also failed on the same astralcodexten feed — lenient sax uppercases tags, which breaks rss-parser's schema-based extraction for namespaced fields like `content:encoded`. The cleanest fix was deleting the dep.
- `gh pr merge --delete-branch` fails the LOCAL sync step when `main` is checked out in another worktree, but the server-side merge still succeeds — we delete remote branches manually afterwards with `git push origin --delete`.

**next**
- rotate `ELEVENLABS_API_KEY` + `ANTHROPIC_API_KEY` (both chat-exposed multiple times).
- set `ELEVENLABS_API_KEY` on prod convex (`npx convex env set --prod`) before `npx convex deploy`.
- phase 3 priorities: live generation status (replace SourceInput's elapsed-time phase estimator with a `generationRuns` subscription), retry button on failed episodes, ffmpeg-static mp3 concat cleanup.
- update `design.md` to describe the art deco system actually in use (current doc is stale brutalist).
- optional: browser-test the full authed flow end-to-end. I verified routes + unauth redirects; the authed happy path was user-verified during phase 2 smoke.
