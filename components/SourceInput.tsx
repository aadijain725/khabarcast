"use client";

import { useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../convex/_generated/api";

// Generate takes ~100s end-to-end (fetch ~1s, dialogue ~45s, tts ~50s).
// Phase-estimator cues the user instead of a silent spinner. Values are
// smoke-run medians; phase 3 swaps this for a live generationRuns subscription.
const PHASES = [
  { atMs: 0, label: "FETCHING FEED" },
  { atMs: 3_000, label: "WRITING DIALOGUE" },
  { atMs: 55_000, label: "RENDERING AUDIO" },
  { atMs: 110_000, label: "ALMOST THERE" },
];

function currentPhase(elapsedMs: number): string {
  let label = PHASES[0].label;
  for (const p of PHASES) if (elapsedMs >= p.atMs) label = p.label;
  return label;
}

export function SourceInput() {
  const router = useRouter();
  const orchestrate = useAction(api.pipeline.orchestrate.run);
  const [feedUrl, setFeedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const start = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - start), 500);
    return () => clearInterval(id);
  }, [loading]);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setElapsedMs(0);
    try {
      const { episodeId } = await orchestrate({ feedUrl: feedUrl.trim() });
      router.push(`/app/episodes/${episodeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handle} className="space-y-6">
      <label className="block">
        <span className="font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#D4AF37]">
          FEED URL · RSS / SUBSTACK
        </span>
        <input
          type="url"
          required
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
          disabled={loading}
          placeholder="https://example.substack.com/feed"
          className="mt-3 w-full bg-transparent border-0 border-b-2 border-[#D4AF37]/40 focus:border-[#D4AF37] outline-none font-display uppercase tracking-[0.05em] text-lg md:text-2xl text-[#F2F0E4] placeholder:text-[#F2F0E4]/25 placeholder:normal-case disabled:opacity-50 py-3 transition-colors duration-300"
        />
      </label>

      {error && (
        <p className="font-display uppercase tracking-[0.15em] text-xs md:text-sm text-[#D4AF37] border border-[#D4AF37]/60 px-4 py-3">
          FAILED · {error.slice(0, 200)}
        </p>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
        <button
          type="submit"
          disabled={loading || !feedUrl.trim()}
          className="group inline-flex items-center gap-3 font-display uppercase tracking-[0.3em] text-xs md:text-sm border border-[#D4AF37] text-[#D4AF37] px-6 py-3 transition-all duration-500 hover:bg-[#D4AF37] hover:text-[#0A0A0A] hover:shadow-[0_0_16px_rgba(212,175,55,0.4)] disabled:opacity-40 disabled:pointer-events-none"
        >
          <span>{loading ? "GENERATING" : "GENERATE"}</span>
          <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-x-1">
            →
          </span>
        </button>

        {loading && (
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="w-2 h-2 rotate-45 bg-[#D4AF37] deco-pulse"
            />
            <span className="font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#F2F0E4]/80">
              {currentPhase(elapsedMs)} · {Math.floor(elapsedMs / 1000)}s
            </span>
          </div>
        )}
      </div>

      <p className="text-xs md:text-sm text-[#F2F0E4]/50 leading-relaxed max-w-prose">
        One generation takes ~90 seconds and produces a 5–6 minute audio
        briefing. Please don&apos;t navigate away — phase 3 will add background
        runs.
      </p>
    </form>
  );
}
