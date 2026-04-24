# poc 3 — topic selector decision

date: 2026-04-25
prompt tested: `poc/03-topic-selector-prompt.md` (v0.1-2026-04-25)
runner: `poc/03-select-topics.ts`
outputs: `poc/topics_out/{astralcodexten,noahpinion,slowboring}.json`

## decision

**fold into poc 1.** do not ship a separate `selectTopics` action in v1.

reversal trigger: if user testing shows dialogue consistently picks shallow/wrong topics, re-introduce as a separate step with a user-facing "review topics" UI.

## what was tested

3 substack articles pulled via poc 2 rss script (first item ≥ 500 words):

| feed | article | words |
|---|---|---|
| astralcodexten | Links For April 2026 | 6395 |
| noahpinion | Is China's soft power really rising, or is America's just crumbling? | 3351 |
| slowboring | What to make of the generic ballot | 4381 |

each passed through the topic selector prompt (claude sonnet-4-6). all 3 returned valid JSON. all 3 returned exactly 3 topics (correct per prompt rule: ≥ 2000 words → 3 topics).

## quality verdict — topics are sharp

sample tension fields:

- **astralcodexten / AI therapy**: advocates say AI therapy democratizes access to support that many people otherwise never get; skeptics say unlimited availability removes the productive friction that makes traditional therapy build independent coping capacity.
- **noahpinion / Censorship Stunting vs. Enabling Culture**: the conventional view holds that censorship kills the authentic, boundary-pushing creativity needed for global cultural appeal, but the microdrama explosion suggests volume and format innovation can outpace state control, at least temporarily.
- **slowboring / Israel as proxy**: hawks argue the issue reflects core values and coalition loyalty; critics counter that elevating it over domestic economic and public-safety issues is a strategic own-goal.

every topic:
- names both sides of a real disagreement (prompt rule met)
- picks a debatable angle, not a section summary
- would feed cleanly into poc 1's ANCHOR-challenge subtopic

no hallucinated facts. no fake balance ("both sides have a point" filler).

## why fold anyway

1. **poc 1 already scored 5/5 on rubric** with topic selection baked into a single call. the quality gap between "poc 1 alone" and "topic selector + poc 1" is unmeasured — and unmeasured improvement doesn't justify adding infrastructure.
2. **cost + latency**: extra sonnet call adds ~14s wall + ~$0.025/episode. on an already-31s pipeline, that's a 45% latency tax for a quality gain that's not demonstrated.
3. **more failure modes**: 2 api calls = 2 ways to break. for a 1-week v1 ship, fewer moving parts wins.
4. **poc 1 prompt already enforces topic shape** (FACT → CHALLENGE → SYNTHESIS, 2 topics for < 2000 words, 3 for longer). adding a selector step duplicates the rule without adding new signal.

## when to revert (ship v2 with separate step)

reinstate topic selector as a separate convex action if any of these fire after v1 goes live:

- **user complaint pattern**: "the podcast picked the wrong topic from my article" in ≥ 2 of 5 manual evals.
- **UI requirement**: user wants to pick/edit which 2–3 topics get discussed before dialogue is rendered.
- **debugging pain**: episode quality drops inexplicably and we can't tell whether the problem is topic picking or dialogue writing.

when revert: `convex/pipeline/selectTopics.ts` action using the prompt locked in `poc/03-topic-selector-prompt.md` (bump version to v1). stored output shape ships unchanged — already matches `{ topics: [{ title, angle, why_it_matters, tension }] }`.

## artifacts to keep

- `poc/03-topic-selector-prompt.md` — kept as reference / benchmark for what good topic selection looks like. can be used to grade poc 1 output post-hoc.
- `poc/topics_out/*.json` — reference examples. useful when iterating poc 1 prompt (poc 1 output topics should be at least this sharp).
- `poc/03-select-topics.ts` — keep. low-cost way to re-validate the benchmark if poc 1 quality regresses.

## what was NOT tested

- direct A/B: poc 1 raw vs poc 1 with topics prepended. would need ~$0.30 + 3 min to run across 3 articles. skipped because the decision is lean-leaning and a tie would still mean "fold for v1". if v1 ships and quality is suspect, this A/B is the first experiment to run.
- prompt iteration rounds. v0.1 hit quality bar on first try; no tuning needed.
