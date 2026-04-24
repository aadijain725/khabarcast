import Link from "next/link";
import { LoginForm } from "../../components/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* NAV */}
      <nav className="border-b border-[#D4AF37]/60">
        <div className="flex items-center justify-between px-4 md:px-10 h-16 md:h-20 max-w-7xl mx-auto">
          <Link
            href="/"
            className="group flex items-center gap-3"
          >
            <span aria-hidden="true" className="font-display text-[#D4AF37] transition-transform duration-300 group-hover:-translate-x-1">←</span>
            <span aria-hidden="true" className="w-3 h-3 border border-[#D4AF37] rotate-45 group-hover:bg-[#D4AF37] transition-colors duration-300" />
            <span className="font-display uppercase tracking-[0.3em] text-sm md:text-base text-[#F2F0E4] group-hover:text-[#D4AF37] transition-colors">
              KHABARCAST
            </span>
          </Link>
          <span className="font-display uppercase tracking-[0.3em] text-xs text-[#D4AF37]">
            SIGN IN
          </span>
        </div>
        <div aria-hidden="true" className="h-px bg-[#D4AF37]/30" />
      </nav>

      <div className="relative flex-1 px-4 md:px-8 py-20 md:py-32 flex flex-col justify-center overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 deco-sunburst pointer-events-none opacity-70" />

        <div className="relative max-w-3xl mx-auto w-full text-center">
          <div className="flex items-center gap-4 justify-center">
            <span aria-hidden="true" className="deco-rule" />
            <p className="font-display uppercase tracking-[0.4em] text-xs md:text-sm text-[#D4AF37]">
              WELCOME BACK
            </p>
            <span aria-hidden="true" className="deco-rule" />
          </div>

          <h1 className="mt-10 font-display uppercase tracking-[0.08em] leading-[0.95] text-[clamp(3rem,12vw,10rem)] text-[#F2F0E4]">
            LOG
            <br />
            <span className="text-[#D4AF37]">IN.</span>
          </h1>

          <div className="mt-10 md:mt-14 flex items-center justify-center gap-4">
            <span aria-hidden="true" className="h-px w-16 bg-[#D4AF37]" />
            <span aria-hidden="true" className="w-3 h-3 rotate-45 border border-[#D4AF37]" />
            <span aria-hidden="true" className="w-2 h-2 rotate-45 bg-[#D4AF37]" />
            <span aria-hidden="true" className="w-3 h-3 rotate-45 border border-[#D4AF37]" />
            <span aria-hidden="true" className="h-px w-16 bg-[#D4AF37]" />
          </div>

          <div className="mt-14 md:mt-20">
            <LoginForm />
          </div>

          <p className="mt-16 font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#F2F0E4]/60">
            NEW HERE? THE SAME DOOR OPENS BOTH WAYS.
          </p>
        </div>
      </div>

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
