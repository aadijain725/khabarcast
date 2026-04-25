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

## phase 4 — MAAS pivot (target: L3 across rubric)

pivot from straight-line pipeline → manager + specialist agents. existing helpers (`doFetch`, `doGenerate`, `doRender`) become tools the agents call. keeps phase 0-2 work intact.

### agent org

```
MANAGER (claude sonnet, convex action)
  routes intent → calls specialists → logs every step to generationRuns

  ├── CURATOR (continuous, grows with feedback)
  │    bootstrap: substack handle scrape (substack.com/@handle/reads) +
  │                feedly cloud recs fallback by category → topic buttons
  │    growing: post-episode feedback (uses topicFlags) reweights user_topics
  │    persists: user_topics, user_feeds (connector pattern)
  │
  ├── RESEARCHER (per episode)
  │    reads user_feeds + user_topics → connector.fetchLatest() →
  │    claude ranks posts by topic-match → returns top 2-3 articles
  │
  ├── SCRIPTWRITER (sub-team)
  │    ├── IDEOLOGY AGENTS (dynamic: 1 per slot, parameterized by host record)
  │    │    reads host.ideologyPrompt + host.persona → returns stance,
  │    │    key arguments, tone for that host on that bundle
  │    │    spawned by manager based on user host selection (L4 dynamic delegation)
  │    └── COMPOSER (existing generateScript, refactored)
  │         takes stances + facts → emits dialogue JSON (KALAM/ANCHOR slots)
  │
  └── VOICE (existing renderAudio, unchanged)
```

### schema additions (additive, zero-downtime)

- [x] `convex/schema.ts`: add `hosts` table { ownerTokenId?, slot ("KALAM"|"ANCHOR"), name, voiceId, voiceModel, voiceParams, ideologyPrompt, persona, createdAt }
- [x] add `userTopics` { userTokenId, topic, weight, source ("onboarding"|"feedback"|"trending"|"manual"), lastReinforcedAt }
- [x] add `userFeeds` { userTokenId, kind ("substack"|"rss"|"feedly"), handle, title?, addedAt }
- [x] extend `episodes` with optional `hostMapping` { KALAM: Id<hosts>, ANCHOR: Id<hosts> }
- [x] extend `generationRuns` with optional trace fields: step, agentName, parentRunId, inputPreview, outputPreview, tokensIn, tokensOut, costUsd, latencyMs (+ sourceId widened to optional for curator/manager runs)
- [x] seed two global hosts on first deploy: KALAM (existing voice + ideology) + ANCHOR (existing voice + ideology) — `hosts.seedDefaultsInternal`

### connectors (newsletter ingest abstraction)

- [x] `convex/connectors/types.ts` — `Connector` interface: `fetchLatest(handle, n) → RawArticle[]`
- [x] `connectors/substack.ts` — handle.substack.com/feed (wraps existing `fetchFeedItems` helper from fetchSource)
- [x] `connectors/genericRss.ts` — paste-any-feed escape hatch
- [x] `connectors/index.ts` — registry; `getConnector(kind)`
- [ ] `connectors/feedly.ts` — DEFERRED (recs-only fallback, not on critical path)

### agents

- [x] `convex/agents/lib/runLog.ts` — `withTrace(ctx, meta, body) → { runId, output }`; auto-pending → ok/error patch with latency + cost + token + output preview
- [x] `convex/agents/ideologyAgent.ts` — claude-haiku-4-5, parameterized by host record; returns IdeologyStance
- [x] `convex/agents/composer.ts` — sub-team manager; spawns 2 ideology agents in parallel as children of its trace, then claude-sonnet-4-6 weaves dialogue with hostMapping persisted on episode
- [x] `convex/agents/researcher.ts` — claude-haiku-4-5, ranks connector candidates by weighted topics; per-feed try-catch; rank-failure fallback to first
- [x] `convex/agents/curator.ts` — `doCuratorBootstrap` (substack profile scrape + cold-start fallback + claude clustering) + `doCuratorFeedback` (topicFlags → userTopics weight deltas)
- [x] `convex/agents/manager.ts` — `onboard` + `generateEpisode` actions; full pipeline researcher → composer → audio with try-catch around audio render

### user-facing flows

- [x] `app/app/onboarding/page.tsx` — substack handle input + topic buttons (curator bootstrap; falls back to "skip and use defaults")
- [x] `app/app/hosts/page.tsx` — list hosts (global + user-owned) + "add new host" form (name + voice_id + ideology prompt + slot)
- [x] `app/app/runs/page.tsx` — observability, list runs, click to expand step-by-step trace tree (uses generationRuns.parentRunId)
- [x] update `app/app/page.tsx` (generate screen) — pick 1 host per slot from hosts table; primary CTA calls manager.generateEpisode; legacy paste-URL preserved under details/disclosure
- [x] `app/app/curate/page.tsx` — growing curator UI (post-episode feedback dropdown + run button + per-topic +/- weight nudge + remove buttons + feeds list). Auth-wrapped `agents.curator.feedback` action added.

### observability (rubric L3)

- [x] every agent call wraps with `withTrace` → writes generationRuns row with parentRunId chain
- [x] /app/runs renders trace tree from `parentRunId` chain
- [x] cost + latency per step visible in run detail
- [x] error rows include error message preview (status badge + collapsible error block)

### evals (rubric L2 → L3)

- [x] `convex/evals.ts` — golden set (3 substack feeds with expected themes) + claude-as-judge rubric (factual fidelity, persona consistency, debate dynamic, length adherence, hook quality) + scorecard internalAction
- [x] one manual scorecard run saved at `evals/scorecard-20260425-1340.json`. Result: 19/25 on noahpinion "Why shoplifting is bad" — factual 5, persona 4, debate 4, length 2, hook 4. Length is the actionable weak spot for next composer prompt iteration.
- [ ] expand golden set to 5 articles + retry the full multi-item run (currently the 3-item run hits transient anthropic fetch failures partway through; works at limit=1)

### memory (rubric L3-L4)

- [ ] curator reads past episodes from user history before generating new topic buttons
- [ ] researcher boosts un-covered user_topics, decays repeated ones
- [ ] hosts can have memory of past episodes ("as i said last week...") — STRETCH

### stretch (only if all L3 above is green)

- [ ] `app/api/feed/[token]/route.ts` — per-user RSS for apple/overcast/pocket casts
- [ ] ElevenLabs IVC upload UI (drag-drop audio → voice_id) → unlocks management UI L5
- [ ] cross-user trending topics view (opt-in)

### phase 4 ship gate

- [ ] types pass, lint pass, `npm run dev` smoke
- [ ] golden eval run + screenshot
- [ ] generationRuns trace tree screenshot
- [ ] hosts page screenshot
- [ ] commit + push → vercel auto-deploy
- [ ] `npx convex deploy` for backend

### curator personalization fix (2026-04-25, in progress)

**bug**: curator scrapes `substack.com/@<handle>` (= user PROFILE, not their reads) → recommends pubs the user *follows on substack*, not their actual newsletter list. then silently falls back to a hardcoded list (noahpinion, slowboring, etc) when scrape returns nothing. researcher re-runs pick same articles because no exclude-already-covered logic. result: every user gets the same 5 substacks, same articles, every time.

**A. replace profile-scrape with explicit feed-list (the real fix)**
- [x] new helper `parseFeedLine(line)` in curator: handles bare substack handle, `@handle`, `https://x.substack.com`, full RSS URL → `{kind, handle, normalizedFeedUrl}`
- [x] `doCuratorBootstrap` takes `feedLines: string[]`. validates each line via `fetchFeedItems(url, 1)` in parallel (Promise.allSettled). returns `{feedsValidated, feedsRejected: [{line, reason}], suggestedTopics}`
- [x] cluster topics via claude using ONLY validated feed titles (drop FALLBACK_TOPICS)
- [x] drop FALLBACK_FEEDS entirely (D)
- [x] manager.onboard signature update: `feedLines` instead of `substackHandle`
- [x] update onboarding page: textarea (one feed per line) + per-line validation badges + reject reasons inline

**B. topic-first path (for users without a list)**
- [x] new file `convex/connectors/topicCatalog.ts` — hand-curated 6 themes × 3 substacks
- [x] new internal helper `feedsForTopics(topics: string[]) → CatalogFeed[]` (case-insensitive substring match)
- [x] new public action `agents.curator.fromTopics({topics})` + `agents.manager.suggestFromTopics`
- [x] onboarding page: mode toggle between "i have feeds" (textarea) and "show me popular" (topic chips → suggested feeds → multi-select)

**C. researcher dedupe (no repeat articles)**
- [x] new internal query `sources.listUrlsForUserInternal(userTokenId) → string[]`
- [x] researcher filters candidates by url already in user's sources before ranking
- [x] all-dupes throws "no fresh articles in your feeds — add more or wait for new posts"

**D. no silent fallback**
- [x] curator throws explicit error when 0 valid feeds, with sample rejected lines
- [x] manager.onboard surfaces validation errors back to UI (CuratorBootstrapResult)
- [x] onboarding page renders rejected-lines block with reasons

**verify**
- [x] types pass (`npx tsc --noEmit`)
- [x] lint pass
- [x] backend smoke: 4 lines (2 valid + 2 invalid) → curator returned 2 valid, 2 rejected with honest reasons, 6 topics clustered from real feeds. trace row visible in /app/runs.
- [x] backend smoke: topic chips → catalog lookup returned 6 feeds across 2 themes, deduped by handle.
- [x] backend smoke: researcher run 1 → 6 candidates picked one article. run 2 → 5 candidates (1 filtered as already-covered) picked a different article. dedupe confirmed.
- [ ] browser smoke (mode A textarea, mode B chips, end-to-end commit) — needs your eyes; dev server running on :3000

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
