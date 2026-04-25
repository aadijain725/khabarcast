# 2026-04-25 — curator personalization + hosts UX cleanup

two work blocks shipped this session. each lands as its own commit. this file
captures what's in each, why, and what's deferred. companion docs:
- `tasks/todo.md` — rolling plan; phase 5 (voice clone agent) added at the bottom.
- `tasks/lessons.md` — corrections / never-do-X-again rules. nothing new this session.

---

## block 1 — curator personalization fix

**what shipped (commit `phase 4: curator personalization — paste feeds, topic catalog, dedupe`)**

curator was scraping `substack.com/@<handle>` as the user's "subscription list",
but that URL is the user's *public profile* (publications they recommend),
not their actual reads. on top of that the agent silently fell back to a
hardcoded list (noahpinion, slowboring, astralcodexten…) when the scrape
returned nothing — so every user got the same 5 substacks. researcher then
re-picked the same articles every run because there was no exclude-already-
covered logic.

four fixes, each maps to a letter from the original plan:

- **A. explicit feed-list paste** — curator now takes `feedLines: string[]`.
  parses each line as a substack handle, `@handle`, full publication URL, or
  RSS URL. validates every line in parallel via `fetchFeedItems(url, 1)`.
  returns `{ feedsValidated, feedsRejected, suggestedTopics }`. profile-scrape
  + extractSubstackHandles deleted.
- **B. topic-first path** — new `convex/connectors/topicCatalog.ts` with 6
  themes × 3 substacks each. user picks topic chips, server returns matching
  feeds via `feedsForTopics()`. new public action `agents.curator.fromTopics`
  + `agents.manager.suggestFromTopics` wrapper. onboarding UI gets a mode
  toggle: "I HAVE FEEDS" (textarea) vs "SHOW ME POPULAR" (chips).
- **C. researcher dedupe** — new internal query
  `sources.listUrlsForUserInternal(userTokenId)` returns lowercased URLs.
  researcher filters candidates against this set before ranking. when all
  candidates are dupes, throws a clear "no fresh articles in your feeds —
  add more or wait for new posts" error instead of re-picking.
- **D. no silent fallback** — `FALLBACK_FEEDS` and `FALLBACK_TOPICS` deleted.
  if zero lines validate, curator throws with a sample of rejected lines and
  reasons. the UI surfaces the rejection block inline above the feed grid.

**files touched**

- `convex/agents/curator.ts` — full rewrite (PROMPT_VERSION → curator-v2-2026-04-25)
- `convex/connectors/topicCatalog.ts` — new
- `convex/agents/manager.ts` — `onboard` takes `feedLines` instead of `substackHandle`; new `suggestFromTopics` action + internal CLI variant
- `convex/agents/researcher.ts` — added dedupe block before rank
- `convex/sources.ts` — new `listUrlsForUserInternal` internal query
- `app/app/onboarding/page.tsx` — full rewrite for mode A/B toggle, rejected-lines UI, validated-feed grid
- `tasks/todo.md` — `### curator personalization fix (2026-04-25, in progress)` checkboxes filled in

**smoke evidence**

- 4 lines (2 valid + 2 invalid) → 2 accepted, 2 rejected with honest reasons (404, empty feed). topics clustered from real feeds.
- topic-mode catalog returned 6 feeds across 2 picked themes, deduped by handle.
- researcher run 1 → 6 candidates → article X. run 2 → 5 candidates (X filtered as already-covered) → article Y.
- trace tree at `/app/runs` shows new `curator-bootstrap` and `curator-from-topics` rows under each manager root run.

**known caveats**

- bare-domain RSS attempts (e.g. `https://www.slowboring.com`) get `/feed` appended and validated; some sites return their feed at a different path. user can paste the full feed URL when needed.
- topic catalog is hand-curated. expanding requires editing `topicCatalog.ts` directly. no UI yet for adding catalog entries.

**not done**

- per-line validation badges in the textarea while typing (debounced live-validate). currently you click VALIDATE to see results.
- saving rejected lines for later retry.
- substack inbox cookie-paste (deferred per user's pick of "guide-them" path; that landed remotely via ultraplan).

---

## block 2 — speaker research + hosts UX cleanup

**what shipped (commit `phase 4: speaker research agent + slot relabel + optional voiceId`)**

the hosts page was a wall: nobody knows what an "ideology prompt" should look
like for Naval or Ambedkar, and the form blocked submit until you pasted an
ElevenLabs voiceId — locking out anyone without an account. fixed both.

three pieces:

1. **`convex/agents/speakerResearcher.ts` (new)** — given a person name + slot,
   fetches a Wikipedia REST summary (keyless, falls through to claude-only on
   404), asks claude-sonnet-4-6 to convert into our existing prompt template
   ("Tone: ... Lens: ... Job: ..."), returns `{ name, persona, ideologyPrompt,
   wikipediaUsed }`. wrapped in `withTrace`. action does NOT insert; UI calls
   `api.hosts.create` after the user reviews. graceful "INSUFFICIENT_INFO:"
   refusal when person isn't in training data and wiki has nothing.

2. **slot relabel — KALAM → MAIN SPEAKER, ANCHOR → HOST** — schema literals
   stay `"KALAM"` / `"ANCHOR"` (renaming is a migration with zero UX gain),
   but everywhere user-facing now reads MAIN SPEAKER / HOST via render-time
   maps:
   - `app/app/hosts/page.tsx` — `SLOT_LABEL` constant; both slot pickers + roster card badges
   - `components/GenerateFromFeeds.tsx` — slot picker labels
   - `components/TranscriptTurn.tsx` — `SPEAKER_LABEL` map; per-turn label

3. **voiceId optional with slot-based fallback** — `convex/hosts.ts:create`
   mutation now accepts `voiceId: v.optional(v.string())`. when blank, looks
   up the first global host of that slot and inherits its voiceId + voiceModel
   + voiceParams. UI label changed to "Voice id (optional)", placeholder
   "leave blank for default", helper text below explains the fallback +
   names phase B as the upgrade path. validation no longer requires voiceId.

**files touched**

- `convex/agents/speakerResearcher.ts` — new
- `convex/hosts.ts` — `create` mutation: optional voiceId, slot fallback lookup
- `app/app/hosts/page.tsx` — RESEARCH A SPEAKER section above ADD A HOST form, `SLOT_LABEL` map, voiceId field made optional
- `components/GenerateFromFeeds.tsx` — slot picker label rename
- `components/TranscriptTurn.tsx` — `SPEAKER_LABEL` render map
- `convex/_generated/api.d.ts` — auto-regenerated (covers BOTH blocks' new actions; see note below)

**smoke evidence**

- "Naval Ravikant" / KALAM → wiki-grounded ideology mentioning AngelList, Uber, leverage, mental models. ~3.5s, ~$0.005, sonnet.
- "B.R. Ambedkar" / ANCHOR → structural-justice ideology mentioning constitutional safeguards. ~3s, ~$0.005.
- "asdfqwerty" / KALAM → graceful "INSUFFICIENT_INFO:" refusal in ideologyPrompt; no fabricated biography.
- backend mutation: voiceId omitted → host saves with the slot's seed voiceId + params. confirmed via the convex deployment after `dev --once`.

**known caveats**

- existing seeded global hosts are still named "Kalam-inspired" and "Skeptical Anchor". those names surface in pickers + transcript card titles when chosen, alongside the new MAIN SPEAKER / HOST role labels. could feel inconsistent. fix is a one-line rename via internal mutation when desired.
- `components/HostCard.tsx` (the orphaned decorative landing-page component) still hardcodes "KALAM" / "ANCHOR" as character names. it's not imported anywhere active in the app, so leaving alone.

**not done**

- voice cloning from YouTube (phase B / phase 5; queued in `tasks/todo.md`).
- editing or deleting hosts (still add-only).
- voice preview button ("PLAY SAMPLE" before saving).

---

## note on `convex/_generated/api.d.ts`

this file is auto-generated and its current diff covers all new actions from
BOTH commits (`agents.curator.fromTopics`, `agents.manager.suggestFromTopics`,
`agents.speakerResearcher.run`, …). splitting it cleanly across two commits
would need `git add -p` interactively. pragmatic choice: include the entire
regenerated file in commit 2. mid-bisect, commit 1 won't typecheck without a
manual `npx convex dev --once` rerun. acceptable for sprint history.

---

## next up

`tasks/todo.md` → `## phase 5 — voice clone agent (deferred from phase 4)`.
core idea: agent that takes a person name → finds best YouTube interview →
extracts mp3 → uploads to ElevenLabs IVC → returns voiceId. plumbs into the
hosts page next to the existing RESEARCH button. extractor choice (cobalt.tools
free vs paid rapidapi-yt-mp3 vs vercel-sandbox + yt-dlp) is the one open
infra question — see todo.md for the decision-point.
