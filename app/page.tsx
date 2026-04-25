import Link from "next/link";
import { NavAuthButton } from "../components/NavAuthButton";

const STEPS = [
  {
    num: "I",
    title: "ADD YOUR FEEDS",
    body: "Substack handles or RSS. KhabarCast pulls the latest from each.",
  },
  {
    num: "II",
    title: "PICK YOUR HOSTS",
    body: "Two AI personas debate the story. Swap voices any time.",
  },
  {
    num: "III",
    title: "PRESS PLAY",
    body: "Polished audio in under two minutes. Listen on the go.",
  },
];

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* NAV */}
      <nav className="border-b border-[#D4AF37]/60">
        <div className="flex items-center justify-between px-4 md:px-10 h-16 md:h-20 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-3 group">
            <span
              aria-hidden="true"
              className="w-3 h-3 border border-[#D4AF37] rotate-45 group-hover:bg-[#D4AF37] transition-colors duration-300"
            />
            <span className="font-display uppercase tracking-[0.3em] text-sm md:text-base text-[#F2F0E4]">
              KHABARCAST
            </span>
          </Link>
          <NavAuthButton />
        </div>
        <div aria-hidden="true" className="h-px bg-[#D4AF37]/30" />
      </nav>

      {/* HERO */}
      <section className="relative flex-1 px-4 md:px-8 py-20 md:py-28 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 deco-sunburst pointer-events-none opacity-70"
        />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* eyebrow */}
          <div className="flex items-center gap-4 justify-center">
            <span aria-hidden="true" className="deco-rule" />
            <p className="font-display uppercase tracking-[0.4em] text-xs md:text-sm text-[#D4AF37]">
              AUDIO BRIEFINGS · MMXXVI
            </p>
            <span aria-hidden="true" className="deco-rule" />
          </div>

          {/* title */}
          <h1 className="mt-10 font-display uppercase tracking-[0.08em] leading-[0.95] text-[clamp(3rem,11vw,9rem)] text-[#F2F0E4]">
            YOUR READING
            <br />
            LIST,
            <br />
            <span className="text-[#D4AF37]">SPOKEN.</span>
          </h1>

          {/* glyph */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <span aria-hidden="true" className="h-px w-16 bg-[#D4AF37]" />
            <span aria-hidden="true" className="w-3 h-3 rotate-45 border border-[#D4AF37]" />
            <span aria-hidden="true" className="w-2 h-2 rotate-45 bg-[#D4AF37]" />
            <span aria-hidden="true" className="w-3 h-3 rotate-45 border border-[#D4AF37]" />
            <span aria-hidden="true" className="h-px w-16 bg-[#D4AF37]" />
          </div>

          {/* description */}
          <p className="mt-10 mx-auto max-w-2xl text-base md:text-xl leading-relaxed text-[#F2F0E4]/80 font-light">
            KhabarCast turns the Substacks you follow into AI-narrated podcast
            briefings. Pick your hosts, press play. Listen on the commute, the
            gym, the walk — anywhere your eyes are busy.
          </p>

          {/* CTAs */}
          <div className="mt-12 md:mt-14 flex flex-col sm:flex-row gap-5 items-center justify-center">
            <Link
              href="/login"
              className="group inline-flex items-center gap-3 bg-[#D4AF37] text-[#0A0A0A] font-display uppercase tracking-[0.3em] text-sm md:text-base px-10 py-5 transition-all duration-500 hover:shadow-[0_0_24px_rgba(212,175,55,0.45)] hover:-translate-y-0.5"
            >
              <span>GET STARTED</span>
              <span
                aria-hidden="true"
                className="transition-transform duration-500 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
            <Link
              href="/login"
              className="font-display uppercase tracking-[0.3em] text-xs md:text-sm text-[#F2F0E4]/70 hover:text-[#D4AF37] transition-colors"
            >
              I ALREADY HAVE AN ACCOUNT →
            </Link>
          </div>

          {/* 3-step strip */}
          <div className="mt-20 md:mt-28 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 max-w-3xl mx-auto">
            {STEPS.map((s) => (
              <div key={s.num} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 border border-[#D4AF37] rotate-45 mb-5">
                  <span className="-rotate-45 font-display text-lg text-[#D4AF37]">
                    {s.num}
                  </span>
                </div>
                <h3 className="font-display uppercase tracking-[0.2em] text-sm md:text-base text-[#D4AF37]">
                  {s.title}
                </h3>
                <p className="mt-3 text-sm md:text-base text-[#F2F0E4]/70 font-light leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#D4AF37]/40 px-4 md:px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:justify-between items-center gap-3 font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#F2F0E4]/60">
          <span>© MMXXVI KHABARCAST</span>
          <span className="text-[#D4AF37]">◆</span>
          <span>AUDIO BRIEFINGS FOR YOUR FEED</span>
        </div>
      </footer>
    </main>
  );
}
