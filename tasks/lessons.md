# Lessons

### 2026-04-25 — Vercel build must run `convex deploy` or prod backend ships empty
**Trigger**: standing up a new Convex deployment for prod (separate from dev) and pushing the Next.js app to Vercel
**Do**: add `vercel.json` with `"buildCommand": "npx convex deploy --cmd 'npm run build'"` and set `CONVEX_DEPLOY_KEY` (production-scoped) in Vercel prod env. First deploy still needs a manual `CONVEX_DEPLOY_KEY=... npx convex deploy` to land functions before the next git push, since the build wiring only triggers on push.
**Why**: burned a session on `Could not find public function for 'hosts:listVisible'` etc. — Vercel was running plain `next build`, so prod Convex (`outgoing-anteater-462`) had schema/functions = none. Frontend connected and crashed on first query. The CLAUDE.md shipping flow ("push → vercel handles rest") only works for the backend if you wire convex deploy into the build.

### 2026-04-23 — Don't default to "fewer vendors" on UX-facing flows
**Trigger**: user asks for "simple [user-facing thing]" with multiple implementation paths
**Do**: frame the tradeoff as UX-simple vs setup-simple. Ask which axis matters. Don't pre-pick setup-simple just because it has fewer moving parts.
**Why**: on the auth task I proposed password (zero vendors) as "simple". User pushed back — "is magic link simpler?" — because from the *user's* perspective, magic link is obviously simpler. The 2 min of Resend signup was a fair trade for the nicer UX. "Simple" is ambiguous; ask whose simplicity.

### 2026-04-23 — Next 16 renamed middleware.ts → proxy.ts
**Trigger**: writing Next.js request-interception code in this repo
**Do**: put the file at project root as `proxy.ts`, export default `proxy` function. Same `NextMiddleware` signature as before. Check `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` if unsure.
**Why**: CLAUDE.md warns Next 16 has breaking changes. I caught this by reading the docs dir before writing. If I'd trusted training data I'd have written `middleware.ts` and it may have silently not loaded.

### 2026-04-23 — Vercel env add needs --value, NEXT_PUBLIC_* needs --no-sensitive
**Trigger**: setting Vercel env vars non-interactively
**Do**: `vercel env add NAME <env> --value "the-value" --no-sensitive --yes`. Never pipe via `printf` or `<<<` — Vercel CLI silently stores empty string when stdin isn't a real TTY. Always verify with `vercel env pull <file>` after.
**Why**: burned ~5 min on prod deploy with empty `NEXT_PUBLIC_CONVEX_URL` that broke backend connectivity. `--value` is the only reliable non-interactive input. `--no-sensitive` is correct for `NEXT_PUBLIC_*` (they're public anyway) and lets you verify via `env pull`.

### 2026-04-23 — @convex-dev/auth CLI has no non-interactive mode
**Trigger**: running `npx @convex-dev/auth` in a non-TTY context (scripts, CI)
**Do**: skip the initializer. Generate the RS256 keypair manually with `jose.generateKeyPair('RS256', {extractable:true})`, export as PKCS8 (private) and JWK with `use:"sig"` wrapped in `{keys:[...]}` (JWKS). Set `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS` with `npx convex env set --prod -- NAME "value"` (the `--` matters when values start with `-----BEGIN`).
**Why**: the CLI uses inquirer and refuses non-TTY. For prod (separate deployment from dev), you can't rerun the init interactively easily. Manual key generation is ~10 lines of Node.

### 2026-04-23 — npm cache permission workaround
**Trigger**: `npm install` fails with `EACCES` on `~/.npm/_cacache`
**Do**: use `npm install --cache /tmp/npm-cache-<task-name> <pkg>` to bypass. Tell user the permanent fix is `sudo chown -R 501:20 ~/.npm` (needs their password via `! sudo ...`).
**Why**: known npm bug from old root-run installs. Don't block on it during a task; fix during a setup pass.

### 2026-04-24 — Git worktrees don't inherit untracked files or .env.local
**Trigger**: `git worktree add` in a project where untracked dirs (`poc/`, scratch notes) or `.env.local` matter for the work
**Do**: after creating the worktree, explicitly `cp -r <untracked-dirs> <new-worktree>/` and `cp .env.local <new-worktree>/` before starting. Don't assume the worktree has what you need.
**Why**: worktrees carry tracked state only. Lost time on poc 1 when the megaprompt file and dev convex deployment pointer weren't present in the new worktree and had to be patched in mid-task.

### 2026-04-24 — `npx convex codegen` pushes functions to the deployment, not just local types
**Trigger**: want to regenerate `_generated/` types without side effects (e.g., for tsc validation before committing)
**Do**: know that codegen = push. Acceptable when changes are additive (new tables, new fns). Dangerous if dropping indexes or renaming tables — use `--dry-run` via `npx convex deploy --dry-run` for that.
**Why**: ran codegen expecting local-only types; found fresh schema + fns landed on the dev deployment. Additive in this case so no harm, but it crosses a boundary I didn't notice until I looked.

### 2026-04-24 — Prod Convex deploy from CLI needs CONVEX_DEPLOY_KEY (scoped per deployment)
**Trigger**: `npx convex deploy` in a session where `CONVEX_DEPLOYMENT` points at dev, wanting to push to prod non-interactively
**Do**: generate a production deploy key from the dashboard — switch the top-left dropdown from **Development** to **Production**, then Settings → URL and Deploy Key → Generate Production Deploy Key. Run as `CONVEX_DEPLOY_KEY='prod:<id>|<token>' npx convex deploy`.
**Why**: the "you're configured for dev, push to prod?" confirmation can't be safely bypassed with `yes`-piping (harness will block — that pipe would also auto-confirm any schema-breaking warning). Deploy keys are scoped to one deployment; a dev-generated key won't authorize prod.

### 2026-04-24 — `npx convex run` cannot invoke authed functions
**Trigger**: smoking a `query`/`mutation`/`action` that uses `ctx.auth.getUserIdentity()` from the CLI
**Do**: factor the fn into (1) a public wrapper that does the auth check + (2) an internal variant that takes `userTokenId` as an arg. Call the internal via `npx convex run 'path/file:internalName' '{"userTokenId":"smoke","...":...}'`. The internal surface doubles as the orchestrator's API later, so it's not throwaway scaffolding. Alternative: `npx convex run --identity '{...}'`, but the internal-variant pattern is reusable.
**Why**: no cookies/JWT in `npx convex run` by default. Building internal variants early makes CLI smoke-testing possible AND gives the future cron/orchestrator a clean callsite.

### 2026-04-25 — ElevenLabs: one model rarely fits two voices in the same show
**Trigger**: picking model + params for 2+ voices in a dialogue
**Do**: a/b each voice against ≥3 models independently (`eleven_turbo_v2_5`, `eleven_v3`, `eleven_multilingual_v2`). mixing models across voices is safe — turns render independently and concatenate; listener hears two speakers anyway. don't force a single model for "consistency" unless you've confirmed both voices survive it.
**Why**: `eleven_multilingual_v2` neutralized kalam's indian accent (cloned voice) but gave anchor good intonation. `eleven_turbo_v2_5` preserved kalam's accent + pronunciation but flattened anchor. final lock needed per-voice models — kalam on turbo_v2_5, anchor on v3. mixed-model worry was unfounded.

### 2026-04-25 — ElevenLabs shared voices must be in your library before TTS calls work
**Trigger**: user passes a voice_id from `/v1/shared-voices` (category `professional` or any from the voice library, not `premade`)
**Do**: first check with `GET /v2/voices?voice_ids=<id>` — if 0 matches, either (a) add via UI at `https://elevenlabs.io/app/voice-library?voiceId=<id>` → "Add to Library", or (b) call `POST /v1/voices/add/{public_owner_id}/{voice_id}` (requires `voices: write` scope, not included in the default text-to-speech-only key).
**Why**: hit 401 missing_permissions on the add endpoint because the dev key only had `text_to_speech` + `voices: read`. UI add is 10 sec and avoids re-granting scopes. `premade` voices (the default 21) don't need adding.

### 2026-04-25 — `source .env.local` doesn't export to node child processes
**Trigger**: running `npx tsx script.ts` or any node command that reads `process.env.X` after sourcing a `.env.local`
**Do**: use `set -a && source .env.local && set +a` — the `set -a` flag auto-exports all variables being defined. avoid `export $(grep -v '^#' .env.local | xargs)` — breaks on comments containing colons (e.g. `# team: aadijain`).
**Why**: curl commands in the same shell work because `$VAR` expands shell-side before the child runs. node reads `process.env` which is populated from the inherited environment — sourced-but-not-exported vars aren't there.

### 2026-04-24 — Convex CLI `run` args are positional JSON, not a flag
**Trigger**: invoking a convex fn with structured args from the CLI
**Do**: `npx convex run 'sources:createInternal' '{"userTokenId":"x","title":"t","rawText":"..."}'`. When the JSON contains apostrophes or newlines, write it to a file and `cat` it into the argument: `npx convex run 'fn' "$(cat /tmp/args.json)"`. There is no `--args-file` flag.
**Why**: wasted a minute trying `--args-file`; the CLI silently prints the function list (looks like a "not found" error) when unrecognized flags parse as positional junk.

### 2026-04-25 — ElevenLabs starter-tier concurrency counter doesn't drain instantly
**Trigger**: calling `/v1/text-to-speech` serially but still hitting `429 concurrent_limit_exceeded`
**Do**: add retry with exponential backoff on 429 + 5xx — e.g. 1s/2s/4s, max 4 attempts. Fail fast on other 4xx (auth/input errors). Even with `concurrency=1` in your code, a prior failed run can leave the account-side counter pegged for tens of seconds.
**Why**: first phase 1 orchestrator run crashed mid-render with `TTS_CONCURRENCY=5`. Dropping to 2, then 1, still 429'd because ElevenLabs hadn't released the stuck slots. Backoff retry let the counter drain on attempt 2 and the render completed.

### 2026-04-25 — `npx convex codegen` doesn't reliably register new function files; use `npx convex dev --once`
**Trigger**: adding a new `convex/<newfile>.ts` (especially in a nested dir like `pipeline/`) and trying to invoke it via `npx convex run`
**Do**: run `npx convex dev --once` after adding new function files. It forces a full deploy and is idempotent. `npx convex codegen` sometimes only refreshes local types without pushing new module registrations.
**Why**: phase 1 smoke failed with "Could not find function for 'pipeline/orchestrate:runInternal'" despite codegen reporting "Uploading functions to Convex..." — the new file hadn't actually registered on the deployment. `dev --once` fixed it immediately.

### 2026-04-25 — Helper-function composition beats cross-action RPC for same-runtime pipelines
**Trigger**: orchestrator action wants to chain multiple other actions (all `"use node"`)
**Do**: export each step's core logic as a regular async function (`doFetch`, `doGenerate`, `doRender`) taking `ActionCtx` + typed params. Import them in the orchestrator and call directly. Don't use `ctx.runAction` unless crossing V8↔Node.
**Why**: convex guideline explicitly prefers helper composition over `ctx.runAction` for same-runtime calls (lower latency, shared error propagation, simpler types). Also gives you testability — helpers can be invoked standalone or re-invoked via `:runInternal` endpoints for resumption (we used this to retry `renderAudio` on an episode whose `generateScript` had already succeeded, saving an anthropic re-spend).

### 2026-04-25 — Worktree-spawned subagents see HEAD at spawn time, NOT my uncommitted state
**Trigger**: spawning Agent tool with `isolation: "worktree"` while I have uncommitted scaffolding in main
**Do**: commit foundation files (schemas, stub exports, shared utilities) BEFORE spawning. Worktrees branch off the latest commit, not the working directory. If I forget, the subagent will (a) re-implement what I already wrote inline because the imports don't resolve, (b) run convex dev and hit schema-vs-DB drift because their schema.ts is older than the live deployment.
**Why**: spawned 3 worktree agents (researcher/curator/manager) for parallel work. Two of them (`curator`, `manager`) self-corrected by `git merge main` on entry — they noticed missing files and merged. Researcher didn't, built duplicate `convex/agents/lib/runLog.ts` and `convex/agents/lib/connectors.ts`, and skipped the schema deploy (couldn't push because its outdated schema.ts didn't include `hostMapping` field that was already on episodes rows in the dev deployment). Had to discard researcher branch entirely and rewrite in main using existing infra. Cost ~10 min of churn that a `git commit` before spawning would have prevented.

### 2026-04-25 — `rss-parser` strict sax rejects real-world substack feeds; regex is safer for the 3 fields we actually use
**Trigger**: production feed URL causes `Unexpected close tag` / `Unexpected EOF` from `parser.parseURL(url)` (happened on astralcodexten — text "Line: 190 Column: 11 Char: >")
**Do**: skip rss-parser. `fetch()` the raw feed, regex the first `<item>|<entry>` block, extract `title` + `link` + `content:encoded` (fall back to `content` / `summary` / `description`). Handle CDATA with `<!\[CDATA\[...\]\]>` match. Both strict sax and lenient mode (`xml2js: { strict: false, normalizeTags: true }`) failed on the same feed.
**Why**: substack feeds ship inline HTML (`<img>`, `<br>`, stray `>` in CDATA) that trips sax. Lenient sax uppercases tags, which breaks rss-parser's namespaced field lookups (`content:encoded`). For the 3 fields this pipeline needs, a 30-line regex extractor is more reliable than either parser mode and removes the `rss-parser` dep entirely. Also: `fetch()` in convex node runtime works fine — no need for the `rss-parser` client.
