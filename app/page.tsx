import { WaitlistForm } from "../components/WaitlistForm";
import { NavAuthButton } from "../components/NavAuthButton";

const STATS = [
  { num: "12X", label: "FASTER THAN READING" },
  { num: "∞", label: "SOURCES SUPPORTED" },
  { num: "0", label: "ADS EVER" },
  { num: "24/7", label: "LISTEN ANYWHERE" },
  { num: "6", label: "LANGUAGES LIVE" },
];

const FEATURES = [
  {
    num: "01",
    title: "INBOX IN. AUDIO OUT.",
    body:
      "Connect Substack, RSS, your reading list. KhabarCast packages every issue into a polished audio briefing.",
  },
  {
    num: "02",
    title: "PICK A VOICE.",
    body:
      "Choose voices and languages that match your ear. Switch any time. Every briefing adapts to you.",
  },
  {
    num: "03",
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

export default function Page() {
  return (
    <main className="min-h-screen">
      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-[#09090B] border-b-2 border-[#3F3F46]">
        <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <span className="font-bold uppercase tracking-tighter text-base md:text-lg">
            KHABARCAST<span className="text-[#DFE104]">.</span>
          </span>
          <NavAuthButton />
        </div>
      </nav>

      {/* HERO */}
      <section className="relative px-4 md:px-8 pt-16 md:pt-32 pb-20 md:pb-32 overflow-hidden">
        <p className="uppercase tracking-widest text-xs md:text-sm text-[#A1A1AA] mb-6 md:mb-10">
          [ EARLY ACCESS · 2026 ]
        </p>
        <h1 className="font-bold uppercase tracking-tighter leading-[0.85] text-[clamp(3rem,14vw,14rem)]">
          YOUR READING
          <br />
          LIST,
          <br />
          <span className="text-[#DFE104]">SPOKEN.</span>
        </h1>
        <div className="mt-10 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
          <p className="md:col-span-2 text-lg md:text-xl lg:text-2xl leading-tight text-[#A1A1AA] max-w-2xl">
            KhabarCast turns your newsletters, RSS feeds, and saved articles
            into podcast-grade audio briefings. Commute, gym, walk — anywhere
            your eyes are busy.
          </p>
          <div className="flex md:justify-end">
            <a
              href="#join"
              className="inline-block bg-[#DFE104] text-black font-bold uppercase tracking-tighter px-8 py-4 text-lg transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              JOIN WAITLIST →
            </a>
          </div>
        </div>
      </section>

      {/* STATS MARQUEE */}
      <section
        className="marquee bg-[#DFE104] text-black border-y-2 border-black py-6 md:py-8"
        aria-label="Product stats"
      >
        <div
          className="marquee-track"
          style={{ ["--marquee-duration" as string]: "25s" }}
        >
          {[...STATS, ...STATS, ...STATS, ...STATS].map((s, i) => (
            <div key={i} className="flex items-center gap-6 md:gap-10 pr-10 md:pr-16">
              <span className="font-bold uppercase tracking-tighter text-[5rem] md:text-[8rem] leading-none">
                {s.num}
              </span>
              <span className="font-bold uppercase tracking-tight text-sm md:text-lg max-w-[8ch] leading-tight">
                {s.label}
              </span>
              <span className="text-[5rem] md:text-[8rem] leading-none font-bold">/</span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES — sticky stacking cards */}
      <section className="px-4 md:px-8 py-20 md:py-32">
        <div className="mb-12 md:mb-20 flex flex-col md:flex-row items-start justify-between gap-6">
          <h2 className="font-bold uppercase tracking-tighter leading-[0.85] text-5xl md:text-7xl lg:text-8xl">
            HOW
            <br />
            IT
            <br />
            <span className="text-[#DFE104]">WORKS.</span>
          </h2>
          <p className="text-lg md:text-xl text-[#A1A1AA] max-w-md md:text-right">
            Three steps. No apps to manage. Works with the sources you already
            read.
          </p>
        </div>

        <div className="flex flex-col gap-6 md:gap-10">
          {FEATURES.map((f, i) => (
            <article
              key={f.num}
              className="group sticky bg-[#09090B] border-2 border-[#3F3F46] p-6 md:p-12 hover:bg-[#DFE104] hover:border-[#DFE104] transition-colors duration-300"
              style={{ top: `${96 + i * 24}px` }}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-12">
                <span className="font-bold tabular-nums text-[6rem] md:text-[10rem] leading-[0.8] text-[#27272A] group-hover:text-black transition-colors duration-300">
                  {f.num}
                </span>
                <div className="flex-1 md:max-w-xl md:text-right">
                  <h3 className="font-bold uppercase tracking-tighter leading-[0.9] text-3xl md:text-5xl lg:text-6xl text-[#FAFAFA] group-hover:text-black transition-colors duration-300 md:group-hover:translate-x-[-2rem] md:transition-all">
                    {f.title}
                  </h3>
                  <p className="mt-4 md:mt-6 text-base md:text-lg lg:text-xl leading-tight text-[#A1A1AA] group-hover:text-black group-hover:opacity-80 transition-colors duration-300">
                    {f.body}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS MARQUEE */}
      <section
        className="marquee border-y-2 border-[#3F3F46] py-10 md:py-16"
        aria-label="User testimonials"
      >
        <div
          className="marquee-track"
          style={{ ["--marquee-duration" as string]: "60s" }}
        >
          {[...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <figure
              key={i}
              className="flex flex-col justify-between border-r-2 border-[#3F3F46] px-8 md:px-16 py-4 min-w-[20rem] md:min-w-[36rem]"
            >
              <blockquote className="font-bold uppercase tracking-tighter text-2xl md:text-4xl lg:text-5xl leading-[0.95]">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-4 md:mt-6 text-xs md:text-sm uppercase tracking-widest text-[#A1A1AA]">
                {t.author}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* WAITLIST CTA */}
      <section
        id="join"
        className="px-4 md:px-8 py-20 md:py-32 border-b-2 border-[#3F3F46]"
      >
        <p className="uppercase tracking-widest text-xs md:text-sm text-[#A1A1AA] mb-6 md:mb-10">
          [ GET IN ]
        </p>
        <h2 className="font-bold uppercase tracking-tighter leading-[0.85] text-[clamp(2.5rem,10vw,9rem)] mb-10 md:mb-16">
          DROP YOUR
          <br />
          <span className="text-[#DFE104]">EMAIL.</span>
        </h2>
        <WaitlistForm />
        <p className="mt-6 md:mt-8 uppercase tracking-widest text-xs text-[#A1A1AA]">
          NO SPAM · EARLY ACCESS · UNSUBSCRIBE ANY TIME
        </p>
      </section>

      {/* FOOTER */}
      <footer className="px-4 md:px-8 py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <span className="font-bold uppercase tracking-tighter text-5xl md:text-7xl lg:text-8xl leading-[0.85]">
            KHABAR
            <br />
            <span className="text-[#DFE104]">CAST.</span>
          </span>
          <div className="flex flex-col gap-2 text-xs md:text-sm uppercase tracking-widest text-[#A1A1AA]">
            <span>© 2026 KHABARCAST</span>
            <span>AUDIO BRIEFINGS FOR YOUR FEED</span>
            <span>MADE FOR LISTENING</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
