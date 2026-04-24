import Link from "next/link";
import { WaitlistForm } from "../components/WaitlistForm";
import { NavAuthButton } from "../components/NavAuthButton";

const STATS = [
  { num: "XII", label: "FASTER THAN READING" },
  { num: "∞", label: "SOURCES SUPPORTED" },
  { num: "0", label: "ADS EVER" },
  { num: "24/7", label: "LISTEN ANYWHERE" },
  { num: "VI", label: "LANGUAGES LIVE" },
];

const FEATURES = [
  {
    num: "I",
    title: "INBOX IN. AUDIO OUT.",
    body:
      "Connect Substack, RSS, your reading list. KhabarCast packages every issue into a polished audio briefing.",
  },
  {
    num: "II",
    title: "PICK A VOICE.",
    body:
      "Choose voices and languages that match your ear. Switch any time. Every briefing adapts to you.",
  },
  {
    num: "III",
    title: "GETS SHARPER DAILY.",
    body:
      "The more you listen, the smarter the queue. Stories you actually want, in the order that fits your day.",
  },
];

const TESTIMONIALS = [
  { quote: "REPLACED MY COMMUTE PODCASTS.", author: "— A. PATEL, MUMBAI" },
  { quote: "LIKE NPR, BUT IT'S MY FEED.", author: "— L. KIM, BROOKLYN" },
  { quote: "FINALLY HEAR THE STACK I NEVER READ.", author: "— J. RAO, BLR" },
  { quote: "TWO HOURS A DAY BACK.", author: "— M. WALSH, DUBLIN" },
  { quote: "SOUNDS LIKE A REAL SHOW.", author: "— S. NAKAMURA, TOKYO" },
];

/** Art Deco corner brackets — L-shapes at opposite corners of a container */
function CornerBrackets() {
  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute top-2 left-2 w-4 h-4 border-t border-l border-[#D4AF37]" />
      <span aria-hidden="true" className="pointer-events-none absolute top-2 right-2 w-4 h-4 border-t border-r border-[#D4AF37]" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-2 left-2 w-4 h-4 border-b border-l border-[#D4AF37]" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-2 right-2 w-4 h-4 border-b border-r border-[#D4AF37]" />
    </>
  );
}

/** Rotated diamond frame — content inside counter-rotates to stay upright */
function DiamondGlyph({ label }: { label: string }) {
  return (
    <span className="relative inline-flex items-center justify-center w-10 h-10 border border-[#D4AF37] rotate-45 shrink-0">
      <span aria-hidden="true" className="-rotate-45 font-display text-[#D4AF37] text-sm">
        {label}
      </span>
    </span>
  );
}

/** Ornamental section heading — gold rules flanking a label */
function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 justify-center">
      <span aria-hidden="true" className="deco-rule" />
      <p className="font-display uppercase tracking-[0.4em] text-xs md:text-sm text-[#D4AF37]">
        {children}
      </p>
      <span aria-hidden="true" className="deco-rule" />
    </div>
  );
}

export default function Page() {
  return (
    <main className="min-h-screen">
      {/* NAV — framed header with double rule under */}
      <nav className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#D4AF37]/60">
        <div className="flex items-center justify-between px-4 md:px-10 h-16 md:h-20 max-w-7xl mx-auto relative">
          <Link href="/" className="flex items-center gap-3 group">
            <span aria-hidden="true" className="w-3 h-3 border border-[#D4AF37] rotate-45 group-hover:bg-[#D4AF37] transition-colors duration-300" />
            <span className="font-display uppercase tracking-[0.3em] text-sm md:text-base text-[#F2F0E4]">
              KHABARCAST
            </span>
          </Link>
          <NavAuthButton />
        </div>
        {/* double-rule signature */}
        <div aria-hidden="true" className="h-px bg-[#D4AF37]/30" />
      </nav>

      {/* HERO — sunburst glow, centered ceremonial axis */}
      <section className="relative px-4 md:px-8 pt-20 md:pt-36 pb-24 md:pb-40 overflow-hidden text-center">
        <div aria-hidden="true" className="absolute inset-0 deco-sunburst pointer-events-none" />
        {/* architectural vertical lines flanking the hero */}
        <div aria-hidden="true" className="hidden md:block absolute left-10 top-20 bottom-20 w-px bg-gradient-to-b from-transparent via-[#D4AF37]/30 to-transparent" />
        <div aria-hidden="true" className="hidden md:block absolute right-10 top-20 bottom-20 w-px bg-gradient-to-b from-transparent via-[#D4AF37]/30 to-transparent" />

        <div className="relative max-w-5xl mx-auto">
          <SectionEyebrow>EARLY ACCESS · MCMXXVI</SectionEyebrow>

          <h1 className="mt-10 md:mt-14 font-display uppercase tracking-[0.08em] leading-[0.95] text-[clamp(2.75rem,11vw,10rem)] text-[#F2F0E4]">
            YOUR READING
            <br />
            LIST,
            <br />
            <span className="text-[#D4AF37]">SPOKEN.</span>
          </h1>

          {/* decorative sunburst glyph under the title */}
          <div className="mt-10 md:mt-14 flex items-center justify-center gap-6">
            <span aria-hidden="true" className="h-px w-16 md:w-24 bg-[#D4AF37]" />
            <span aria-hidden="true" className="w-3 h-3 rotate-45 border border-[#D4AF37]" />
            <span aria-hidden="true" className="w-2 h-2 rotate-45 bg-[#D4AF37]" />
            <span aria-hidden="true" className="w-3 h-3 rotate-45 border border-[#D4AF37]" />
            <span aria-hidden="true" className="h-px w-16 md:w-24 bg-[#D4AF37]" />
          </div>

          <p className="mt-10 md:mt-14 mx-auto max-w-2xl text-base md:text-xl leading-relaxed text-[#F2F0E4]/80 font-light">
            KhabarCast turns your newsletters, RSS feeds, and saved articles
            into podcast-grade audio briefings. Commute, gym, walk — anywhere
            your eyes are busy.
          </p>

          <div className="mt-12 md:mt-16 flex justify-center">
            <a
              href="#join"
              className="group relative inline-flex items-center gap-4 border-2 border-[#D4AF37] text-[#D4AF37] font-display uppercase tracking-[0.3em] text-sm md:text-base px-10 py-5 transition-all duration-500 hover:bg-[#D4AF37] hover:text-[#0A0A0A] hover:shadow-[0_0_24px_rgba(212,175,55,0.45)]"
            >
              <span>JOIN WAITLIST</span>
              <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* STATS MARQUEE — metallic gold ribbon, Roman numerals where possible */}
      <section
        className="marquee deco-metal text-[#0A0A0A] border-y-2 border-[#0A0A0A] py-5 md:py-7"
        aria-label="Product statistics"
      >
        <div
          className="marquee-track"
          style={{ ["--marquee-duration" as string]: "32s" }}
        >
          {[...STATS, ...STATS, ...STATS, ...STATS].map((s, i) => (
            <div key={i} className="flex items-center gap-6 md:gap-10 pr-10 md:pr-16">
              <span className="font-display uppercase tracking-[0.05em] text-[4.5rem] md:text-[7rem] leading-none">
                {s.num}
              </span>
              <span className="font-display uppercase tracking-[0.3em] text-xs md:text-base max-w-[10ch] leading-tight">
                {s.label}
              </span>
              <span aria-hidden="true" className="w-3 h-3 rotate-45 bg-[#0A0A0A]" />
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES — three ceremonial tiers with Roman numerals */}
      <section className="relative px-4 md:px-8 py-28 md:py-40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20 md:mb-28">
            <SectionEyebrow>HOW IT WORKS</SectionEyebrow>
            <h2 className="mt-8 font-display uppercase tracking-[0.1em] leading-[0.95] text-5xl md:text-7xl text-[#F2F0E4]">
              THREE <span className="text-[#D4AF37]">MOVEMENTS.</span>
            </h2>
            <p className="mt-6 mx-auto max-w-md text-base md:text-lg text-[#F2F0E4]/70 font-light leading-relaxed">
              Three steps. No apps to manage. Works with the sources you already read.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <article
                key={f.num}
                className="group relative bg-[#141414] border border-[#D4AF37]/30 p-10 transition-all duration-500 hover:-translate-y-2 hover:border-[#D4AF37] hover:shadow-[0_0_24px_rgba(212,175,55,0.25)]"
              >
                <CornerBrackets />

                {/* Roman numeral inside diamond */}
                <div className="relative inline-flex items-center justify-center w-16 h-16 border-2 border-[#D4AF37] rotate-45 mb-10">
                  <span className="-rotate-45 font-display text-2xl text-[#D4AF37]">
                    {f.num}
                  </span>
                </div>

                <h3 className="font-display uppercase tracking-[0.15em] text-xl md:text-2xl text-[#D4AF37] leading-snug">
                  {f.title}
                </h3>

                {/* horizontal rule under title */}
                <span aria-hidden="true" className="block h-px w-16 bg-[#D4AF37]/50 my-6 transition-all duration-500 group-hover:w-24 group-hover:bg-[#D4AF37]" />

                <p className="text-base leading-relaxed text-[#F2F0E4]/80 font-light">
                  {f.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS MARQUEE — framed quotes between gold dividers */}
      <section
        className="relative border-y border-[#D4AF37]/40 py-16 md:py-20 overflow-hidden"
        aria-label="User testimonials"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 text-center mb-10 md:mb-14">
          <SectionEyebrow>DISPATCHES FROM LISTENERS</SectionEyebrow>
        </div>
        <div
          className="marquee-track"
          style={{ ["--marquee-duration" as string]: "70s" }}
        >
          {[...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <figure
              key={i}
              className="flex flex-col justify-between border-r border-[#D4AF37]/30 px-10 md:px-16 py-4 min-w-[20rem] md:min-w-[32rem]"
            >
              <blockquote className="font-display uppercase tracking-[0.1em] text-xl md:text-3xl leading-snug text-[#F2F0E4]">
                <span className="text-[#D4AF37] text-3xl md:text-5xl leading-none mr-1">“</span>
                {t.quote}
                <span className="text-[#D4AF37] text-3xl md:text-5xl leading-none ml-1">”</span>
              </blockquote>
              <figcaption className="mt-6 font-display uppercase tracking-[0.3em] text-xs md:text-sm text-[#D4AF37]">
                {t.author}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* WAITLIST CTA — centered stage, gold framing */}
      <section
        id="join"
        className="relative px-4 md:px-8 py-28 md:py-40 overflow-hidden"
      >
        <div aria-hidden="true" className="absolute inset-0 deco-sunburst pointer-events-none opacity-70" />
        <div className="relative max-w-3xl mx-auto text-center">
          <SectionEyebrow>GAIN ADMITTANCE</SectionEyebrow>

          <h2 className="mt-8 font-display uppercase tracking-[0.08em] leading-[0.95] text-[clamp(2.5rem,9vw,7rem)] text-[#F2F0E4]">
            DROP YOUR
            <br />
            <span className="text-[#D4AF37]">EMAIL.</span>
          </h2>

          <div className="mt-12 md:mt-16">
            <WaitlistForm />
          </div>

          <div className="mt-10 flex items-center justify-center gap-4">
            <span aria-hidden="true" className="h-px w-10 bg-[#D4AF37]/60" />
            <p className="font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#F2F0E4]/60">
              NO SPAM · EARLY ACCESS · UNSUBSCRIBE ANY TIME
            </p>
            <span aria-hidden="true" className="h-px w-10 bg-[#D4AF37]/60" />
          </div>
        </div>
      </section>

      {/* FOOTER — architectural mark */}
      <footer className="border-t border-[#D4AF37]/40 px-4 md:px-8 py-14 md:py-20">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-10 text-center">
          <div className="flex items-center gap-4">
            <DiamondGlyph label="K" />
            <span className="font-display uppercase tracking-[0.25em] text-3xl md:text-5xl text-[#F2F0E4]">
              KHABAR<span className="text-[#D4AF37]">CAST</span>
            </span>
            <DiamondGlyph label="C" />
          </div>
          <span aria-hidden="true" className="h-px w-24 bg-[#D4AF37]" />
          <div className="flex flex-col md:flex-row gap-2 md:gap-8 font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#F2F0E4]/60">
            <span>© MMXXVI KHABARCAST</span>
            <span aria-hidden="true" className="hidden md:inline text-[#D4AF37]">◆</span>
            <span>AUDIO BRIEFINGS FOR YOUR FEED</span>
            <span aria-hidden="true" className="hidden md:inline text-[#D4AF37]">◆</span>
            <span>MADE FOR LISTENING</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
