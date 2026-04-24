import Link from "next/link";
import { DashboardIdentity } from "../../components/DashboardIdentity";
import { SignOutButton } from "../../components/SignOutButton";

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

export default function DashboardPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#D4AF37]/60">
        <div className="flex items-center justify-between px-4 md:px-10 h-16 md:h-20 max-w-7xl mx-auto">
          <Link
            href="/"
            className="group flex items-center gap-3"
          >
            <span aria-hidden="true" className="w-3 h-3 border border-[#D4AF37] rotate-45 group-hover:bg-[#D4AF37] transition-colors duration-300" />
            <span className="font-display uppercase tracking-[0.3em] text-sm md:text-base text-[#F2F0E4] group-hover:text-[#D4AF37] transition-colors">
              KHABARCAST
            </span>
          </Link>
          <SignOutButton />
        </div>
        <div aria-hidden="true" className="h-px bg-[#D4AF37]/30" />
      </nav>

      <section className="relative flex-1 px-4 md:px-8 py-20 md:py-32 overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 deco-sunburst pointer-events-none opacity-60" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="flex items-center gap-4 justify-center">
            <span aria-hidden="true" className="deco-rule" />
            <p className="font-display uppercase tracking-[0.4em] text-xs md:text-sm text-[#D4AF37]">
              DASHBOARD · PREVIEW
            </p>
            <span aria-hidden="true" className="deco-rule" />
          </div>

          <h1 className="mt-10 font-display uppercase tracking-[0.08em] leading-[0.95] text-[clamp(2.75rem,10vw,9rem)] text-[#F2F0E4]">
            WELCOME TO THE
            <br />
            <span className="text-[#D4AF37]">GRAND FOYER.</span>
          </h1>

          <div className="mt-10 md:mt-14 flex items-center justify-center gap-4">
            <span aria-hidden="true" className="h-px w-20 bg-[#D4AF37]" />
            <span aria-hidden="true" className="w-3 h-3 rotate-45 border border-[#D4AF37]" />
            <span aria-hidden="true" className="w-2 h-2 rotate-45 bg-[#D4AF37]" />
            <span aria-hidden="true" className="w-3 h-3 rotate-45 border border-[#D4AF37]" />
            <span aria-hidden="true" className="h-px w-20 bg-[#D4AF37]" />
          </div>
        </div>

        <div className="relative max-w-6xl mx-auto mt-20 md:mt-24 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 text-left">
          <div className="group relative bg-[#141414] border border-[#D4AF37]/40 p-10 transition-all duration-500 hover:border-[#D4AF37] hover:shadow-[0_0_24px_rgba(212,175,55,0.2)]">
            <CornerBrackets />
            <DashboardIdentity />
          </div>

          <div className="group relative bg-[#141414] border border-[#D4AF37]/40 p-10 transition-all duration-500 hover:border-[#D4AF37] hover:shadow-[0_0_24px_rgba(212,175,55,0.2)]">
            <CornerBrackets />
            <div className="flex items-center gap-3 mb-6">
              <span aria-hidden="true" className="w-2 h-2 rotate-45 bg-[#D4AF37]" />
              <p className="font-display uppercase tracking-[0.3em] text-xs text-[#D4AF37]">
                WHAT&apos;S NEXT
              </p>
            </div>
            <h2 className="font-display uppercase tracking-[0.15em] text-2xl md:text-3xl text-[#F2F0E4] leading-snug mb-5">
              THE SHOW BEGINS SOON.
            </h2>
            <span aria-hidden="true" className="block h-px w-16 bg-[#D4AF37]/60 mb-5" />
            <p className="text-base md:text-lg leading-relaxed text-[#F2F0E4]/75 font-light">
              Your audio briefings feed lands here soon. Early access opens in
              waves — you will receive an invitation when yours unlocks.
            </p>
          </div>
        </div>
      </section>

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
