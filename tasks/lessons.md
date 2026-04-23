# Lessons

### 2026-04-23 — Don't default to "fewer vendors" on UX-facing flows
**Trigger**: user asks for "simple [user-facing thing]" with multiple implementation paths
**Do**: frame the tradeoff as UX-simple vs setup-simple. Ask which axis matters. Don't pre-pick setup-simple just because it has fewer moving parts.
**Why**: on the auth task I proposed password (zero vendors) as "simple". User pushed back — "is magic link simpler?" — because from the *user's* perspective, magic link is obviously simpler. The 2 min of Resend signup was a fair trade for the nicer UX. "Simple" is ambiguous; ask whose simplicity.

### 2026-04-23 — Next 16 renamed middleware.ts → proxy.ts
**Trigger**: writing Next.js request-interception code in this repo
**Do**: put the file at project root as `proxy.ts`, export default `proxy` function. Same `NextMiddleware` signature as before. Check `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` if unsure.
**Why**: CLAUDE.md warns Next 16 has breaking changes. I caught this by reading the docs dir before writing. If I'd trusted training data I'd have written `middleware.ts` and it may have silently not loaded.

### 2026-04-23 — npm cache permission workaround
**Trigger**: `npm install` fails with `EACCES` on `~/.npm/_cacache`
**Do**: use `npm install --cache /tmp/npm-cache-<task-name> <pkg>` to bypass. Tell user the permanent fix is `sudo chown -R 501:20 ~/.npm` (needs their password via `! sudo ...`).
**Why**: known npm bug from old root-run installs. Don't block on it during a task; fix during a setup pass.
