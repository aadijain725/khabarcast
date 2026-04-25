"use node";

// phase 4 (MAAS): topic-first path for onboarding. User picks topic chips,
// curator looks up matching newsletters from this hand-curated catalog.
// Each catalog entry maps a topic theme → 2-3 well-known substacks for that
// theme. Themes are short noun phrases — same shape as userTopics.topic so
// the chip a user picks ALSO becomes a userTopics row (gives the researcher
// real ranking signal from day one).
//
// Adding a new theme: append to CATALOG. Adding a new newsletter to an
// existing theme: append to that theme's `feeds`. Keep ~3 per theme to keep
// the suggestion list scannable.

export type CatalogFeed = {
  kind: "substack" | "rss";
  handle: string; // for substack: subdomain. for rss: full URL.
  displayName: string;
  blurb: string;
};

export type CatalogTheme = {
  topic: string; // shown as chip label, also persisted as userTopics row
  feeds: CatalogFeed[];
};

export const CATALOG: CatalogTheme[] = [
  {
    topic: "ai and machine learning",
    feeds: [
      {
        kind: "substack",
        handle: "thezvi",
        displayName: "Don't Worry About the Vase",
        blurb: "Zvi Mowshowitz's weekly AI roundup with frank takes",
      },
      {
        kind: "substack",
        handle: "garymarcus",
        displayName: "Marcus on AI",
        blurb: "Gary Marcus on AI hype, hallucinations, and limits",
      },
      {
        kind: "substack",
        handle: "aisupremacy",
        displayName: "AI Supremacy",
        blurb: "Industry analysis on frontier labs and AI economics",
      },
    ],
  },
  {
    topic: "macro economics and policy",
    feeds: [
      {
        kind: "substack",
        handle: "noahpinion",
        displayName: "Noahpinion",
        blurb: "Noah Smith on macro, growth, and industrial policy",
      },
      {
        kind: "substack",
        handle: "slowboring",
        displayName: "Slow Boring",
        blurb: "Matt Yglesias on policy tradeoffs and politics",
      },
      {
        kind: "substack",
        handle: "intheaggregate",
        displayName: "In the Aggregate",
        blurb: "Macro data, charts, and patient explanation",
      },
    ],
  },
  {
    topic: "rationality and science writing",
    feeds: [
      {
        kind: "substack",
        handle: "astralcodexten",
        displayName: "Astral Codex Ten",
        blurb: "Scott Alexander on evidence, mistakes, and rationality",
      },
      {
        kind: "substack",
        handle: "experimental-history",
        displayName: "Experimental History",
        blurb: "Adam Mastroianni on what's wrong with science",
      },
      {
        kind: "substack",
        handle: "asteriskmag",
        displayName: "Asterisk",
        blurb: "Long-form essays on EA-adjacent science topics",
      },
    ],
  },
  {
    topic: "geopolitics and global affairs",
    feeds: [
      {
        kind: "substack",
        handle: "noahpinion",
        displayName: "Noahpinion",
        blurb: "Also covers China, trade, and global econ politics",
      },
      {
        kind: "substack",
        handle: "tashigd",
        displayName: "Tanvi's foreign policy",
        blurb: "On India, the indo-pacific, and rising powers",
      },
      {
        kind: "substack",
        handle: "doomberg",
        displayName: "Doomberg",
        blurb: "Energy + geopolitics from an industrials lens",
      },
    ],
  },
  {
    topic: "culture and society",
    feeds: [
      {
        kind: "substack",
        handle: "bariweiss",
        displayName: "The Free Press",
        blurb: "Heterodox takes on culture, media, free speech",
      },
      {
        kind: "substack",
        handle: "freddiedeboer",
        displayName: "Freddie deBoer",
        blurb: "Education, class, and contrarian leftism",
      },
      {
        kind: "substack",
        handle: "thedispatch",
        displayName: "The Dispatch",
        blurb: "Center-right reporting and analysis",
      },
    ],
  },
  {
    topic: "startups and tech industry",
    feeds: [
      {
        kind: "substack",
        handle: "stratechery",
        displayName: "Stratechery",
        blurb: "Ben Thompson on tech strategy and platforms",
      },
      {
        kind: "substack",
        handle: "platformer",
        displayName: "Platformer",
        blurb: "Casey Newton on tech, social platforms, policy",
      },
      {
        kind: "substack",
        handle: "thefuturisticfarm",
        displayName: "Futuristic Farm",
        blurb: "Frontier tech and venture writing",
      },
    ],
  },
];

// Match the user-selected topics to feeds. Same topic appearing in multiple
// themes is fine — handle dedupes downstream. Case-insensitive substring match
// keeps "AI" matching "ai and machine learning".
export function feedsForTopics(selectedTopics: string[]): CatalogFeed[] {
  const wanted = selectedTopics.map((t) => t.toLowerCase().trim()).filter(Boolean);
  if (wanted.length === 0) return [];
  const out = new Map<string, CatalogFeed>(); // dedupe by handle
  for (const theme of CATALOG) {
    const themeLc = theme.topic.toLowerCase();
    const hit = wanted.some(
      (w) => themeLc.includes(w) || w.includes(themeLc),
    );
    if (!hit) continue;
    for (const f of theme.feeds) {
      if (!out.has(f.handle)) out.set(f.handle, f);
    }
  }
  return Array.from(out.values());
}

export function allCatalogTopics(): string[] {
  return CATALOG.map((c) => c.topic);
}
