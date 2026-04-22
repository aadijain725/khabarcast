import { WaitlistForm } from "../components/WaitlistForm";

const WAVE_BARS = [8, 14, 10, 18, 12, 20, 12, 18, 10, 14, 8];

const FEATURES = [
  "Your newsletters and articles, delivered as polished audio briefings.",
  "Choose from voices and languages that match your style.",
  "Gets smarter over time — surfacing content you’ll actually want to hear.",
];

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col">
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-32 md:py-48">
        {/* Eyebrow */}
        <span className="font-body text-[11px] tracking-[0.25em] uppercase font-medium text-[color:var(--color-amber)]">
          Early Access
        </span>

        {/* Wordmark */}
        <h1 className="mt-5 font-display italic font-light text-6xl md:text-8xl leading-[0.95] tracking-tight text-center">
          <span className="text-[color:var(--color-ink)]">Khabar</span>
          <span className="text-[color:var(--color-amber)]">Cast</span>
        </h1>

        {/* Waveform */}
        <div className="waveform mt-7" aria-hidden="true">
          {WAVE_BARS.map((h, i) => (
            <span key={i} style={{ height: `${h}px` }} />
          ))}
        </div>

        {/* Headline */}
        <p className="mt-7 font-body font-medium text-xl md:text-2xl leading-snug text-[color:var(--color-ink)] max-w-xl text-center tracking-tight">
          Your reading list, delivered as audio.
        </p>

        {/* Subtext */}
        <p className="mt-4 font-body text-[15px] md:text-base leading-relaxed text-[color:var(--color-ink-muted)] max-w-md text-center">
          KhabarCast connects to the newsletters and articles you already read
          {" — "}Substack, RSS, and more{" — "}and turns them into crisp,
          podcast-style audio briefings. Listen on your commute, at the gym, or
          anywhere your eyes are busy.
        </p>

        {/* Numbered features */}
        <ul className="mt-10 flex flex-col gap-4 max-w-md w-full">
          {FEATURES.map((feature, i) => (
            <li key={i} className="flex items-start gap-4">
              <span className="shrink-0 font-body text-xs font-medium text-[color:var(--color-amber)] tabular-nums mt-[3px] w-6">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-body text-[14px] md:text-[15px] leading-snug text-[color:var(--color-ink)]">
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {/* Editorial separator */}
        <hr className="mt-10 w-full max-w-md border-t border-[color:var(--color-border)]" />

        {/* Form */}
        <div className="mt-8 w-full flex flex-col items-center">
          <WaitlistForm />
          <p className="mt-3 font-body text-xs text-[color:var(--color-ink-muted)]">
            No spam. Early access only.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[color:var(--color-border)] py-8 text-center">
        <p className="font-body text-xs text-[color:var(--color-ink-muted)]">
          <span className="font-display italic">KhabarCast</span>
          {" · AI audio briefings for your reading list"}
        </p>
      </footer>
    </main>
  );
}
