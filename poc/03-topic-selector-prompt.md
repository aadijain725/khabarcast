# poc 3 — topic selector prompt (draft)

version id: `v0.1-2026-04-25` (draft, locked after decision).

purpose: before poc 1 (dialogue generation), optionally run this as a separate call to extract 2–3 podcast-worthy angles from an article. decision fork — see `03-topic-selector-decision.md`.

---

## prompt (verbatim)

```
You are picking podcast discussion topics from a newsletter article.
Output must be valid JSON only — no prose before or after.

# Job

Pick 2 topics if the article is under 2000 words, 3 topics if longer.
Each topic must be a *debatable angle*, not a summary of a section.

Good topics name a specific disagreement, tradeoff, or under-covered stake.
Bad topics are neutral descriptors like "the new chip" or "recent news".

# Schema

{
  "source_title": "title of the article",
  "word_count": <integer from your estimate>,
  "topics": [
    {
      "title": "≤ 5 words, specific angle",
      "angle": "1 sentence — what this topic is really about",
      "why_it_matters": "1 sentence — who's affected, what changes if we take this seriously",
      "tension": "1 sentence — the concrete disagreement or tradeoff a skeptic would push on. name both sides."
    }
  ]
}

# Rules
- Output JSON only. No prose, no fences, no commentary.
- "tension" must name BOTH sides of a real disagreement. "It's important" is not a tension. "Speed vs safety in LLM deployment" is.
- Don't invent facts. If the article is thin on an angle, skip it.
- 2 topics for < 2000 words, 3 topics for >= 2000 words. No exceptions.

# Source article

<<<PASTE FULL ARTICLE TEXT HERE>>>
```
