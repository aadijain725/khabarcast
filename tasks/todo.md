# poc 1 follow-through — script generation pipeline

worktree: `khabarcast-poc1-script` (branch `feat/poc1-script-generation`).

## scope

lock poc 1 prompt. build convex action turning article text → two-host dialogue json. no rss, no tts, no ui. those = other pocs.

## tasks

- [x] lock prompt verbatim → `poc/01-final-prompt.md`
- [x] schema: add `sources`, `episodes`, `generationRuns` tables + indexes in `convex/schema.ts`
- [x] `npm i @anthropic-ai/sdk` (used `--cache /tmp/npm-cache-poc1-script` per lessons.md)
- [x] `convex/sources.ts` — public mutation `create` (auth'd, takes title/text/url), returns sourceId
- [x] `convex/episodes.ts` — public queries `get` + `listMine`, internal mutation `insertFromRunInternal`
- [x] `convex/generationRuns.ts` — internal mutations `createInternal`, `markOkInternal`, `markErrorInternal`
- [x] `convex/pipeline/generateScript.ts` — action (`"use node";`). auth required. calls anthropic w/ locked prompt. parses json (strips fences defensively). validates shape before insert. writes episode + updates run.
- [x] `npx convex codegen` — schema + fns pushed to dev deployment, clean
- [x] `npx tsc --noEmit` green
- [x] `npx eslint` green on new files
- [x] `ANTHROPIC_API_KEY` set on dev deployment `agreeable-oriole-671`
- [x] smoke: 1 source (semiconductor article, ~550 words) → generator → episode. 5/5 on rubric. run `k979c2hym5dg4pxqd1djjjg8sn85f243` marked `ok` in 31.3s, episode `k57badgx0m8rmrtsb6etcchx7n85eemd`
- [ ] **user action**: rotate `ANTHROPIC_API_KEY` (was pasted in chat)
- [ ] **user action**: set key on prod deployment separately if ready to deploy: `npx convex env set --prod ANTHROPIC_API_KEY <new>`
- [ ] refactor note: added `sources.createInternal` + `pipeline/generateScript.runInternal` + `episodes.getInternal` to enable CLI smoke. these are the same surface the future orchestrator will use — kept, not cleaned up.

## data model

```
sources:        { userTokenId, title, rawText, url?, wordCount } + by_userToken
episodes:       { userTokenId, sourceId, runId, episodeTitle, sourceTitle, dialogueJson, promptVersion }
                 + by_userToken, by_source
generationRuns: { userTokenId, sourceId, episodeId?, status("pending"|"ok"|"error"),
                  model, promptVersion, errorMessage?, startedAt, finishedAt? }
                 + by_userToken, by_source
```

`dialogueJson` stored as full `v.object(...)` matching the schema from the locked prompt (topics → subtopics → turns). validates shape at write time.

## not in scope

poc 2 (rss fetch), poc 3 (topic selector), poc 4 (tts), phase 2 (ui). orchestrator too — `generateScript` is callable directly from dashboard for now.

## review

**what changed**
- locked poc 1 megaprompt as `poc/01-final-prompt.md` + embedded verbatim in `convex/pipeline/generateScript.ts` with `PROMPT_VERSION = "v1-2026-04-24"`. bump version string whenever the prompt text is edited.
- new tables: `sources`, `episodes`, `generationRuns`. `episodes.dialogue` is validated at insert time via a shared `dialogueValidator` exported from `schema.ts` (union literals on labels, speakers).
- ownership model: `userTokenId` (from `identity.tokenIdentifier` per convex guidelines) stored on every row; queries filter by it.
- action does: auth → load owned source → create run (pending) → call Anthropic `claude-sonnet-4-6` → strip fences → parse → shape-validate → insert episode → mark run ok. any throw marks run error with `errorMessage` (first 1000 chars).

**decisions**
- sourceId in, not raw text. keeps shape stable for phase 1 rss handoff later.
- prompt text duplicated between md file + action source. not DRY but convex actions can't read repo files at runtime; keep sync via PROMPT_VERSION bump rule.
- model `claude-sonnet-4-6` (latest sonnet). opus overkill for dialogue gen at this stage.

**surprises**
- `npx convex codegen` pushed to the dev deployment, not just local type generation. additive schema change, no risk, but main worktree's convex/ is now out-of-sync with the deployed schema. flag if user switches back.
- worktree didn't inherit untracked `poc/` or `.env.local` from main — copied manually.

**next**
- set `ANTHROPIC_API_KEY`, smoke end-to-end via dashboard.
- if smoke passes: poc 2 (rss) or poc 4 (tts) next.
