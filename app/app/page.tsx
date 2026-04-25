import Link from "next/link";
import { GenerateFromFeeds } from "../../components/GenerateFromFeeds";

export default function GeneratePage() {
  return (
    <section className="relative px-4 md:px-8 py-16 md:py-24 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 deco-sunburst pointer-events-none opacity-40"
      />

      <div className="relative max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="deco-rule" />
          <p className="font-display uppercase tracking-[0.4em] text-[10px] md:text-xs text-[#D4AF37]">
            GENERATE · CHAPTER I
          </p>
        </div>

        <h1 className="mt-8 font-display uppercase tracking-[0.08em] leading-[0.95] text-[clamp(2.5rem,8vw,7rem)] text-[#F2F0E4]">
          YOUR FEED.
          <br />
          <span className="text-[#D4AF37]">DEBATED.</span>
        </h1>

        <p className="mt-8 max-w-2xl text-base md:text-lg text-[#F2F0E4]/75 leading-relaxed">
          A team of agents reads your newsletter feed, picks the most relevant
          piece against your topic preferences, builds two ideological stances,
          and composes a debate between two voices.
        </p>
      </div>

      <div className="relative max-w-3xl mx-auto mt-12 md:mt-16">
        <GenerateFromFeeds />
      </div>

      <div className="relative max-w-5xl mx-auto mt-16 md:mt-20 flex items-center justify-between gap-4 border-t border-[#D4AF37]/30 pt-8">
        <p className="font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#F2F0E4]/50">
          PAST EPISODES
        </p>
        <Link
          href="/app/history"
          className="group inline-flex items-center gap-2 font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#D4AF37] hover:text-[#F2F0E4] transition-colors"
        >
          <span>OPEN HISTORY</span>
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
