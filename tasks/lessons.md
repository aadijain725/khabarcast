# Lessons

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
