import Link from "next/link";
import { SignOutButton } from "../../components/SignOutButton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#D4AF37]/60">
        <div className="flex items-center justify-between px-4 md:px-10 h-16 md:h-20 max-w-7xl mx-auto">
          <Link href="/app" className="group flex items-center gap-3">
            <span
              aria-hidden="true"
              className="w-3 h-3 border border-[#D4AF37] rotate-45 group-hover:bg-[#D4AF37] transition-colors duration-300"
            />
            <span className="font-display uppercase tracking-[0.3em] text-sm md:text-base text-[#F2F0E4] group-hover:text-[#D4AF37] transition-colors">
              KHABARCAST
            </span>
          </Link>

          <div className="flex items-center gap-3 md:gap-5">
            <Link
              href="/app"
              className="hidden md:inline font-display uppercase tracking-[0.3em] text-xs text-[#F2F0E4]/70 hover:text-[#D4AF37] transition-colors"
            >
              GENERATE
            </Link>
            <Link
              href="/app/history"
              className="hidden md:inline font-display uppercase tracking-[0.3em] text-xs text-[#F2F0E4]/70 hover:text-[#D4AF37] transition-colors"
            >
              HISTORY
            </Link>
            <SignOutButton />
          </div>
        </div>
        <div aria-hidden="true" className="h-px bg-[#D4AF37]/30" />
      </nav>

      <div className="flex-1">{children}</div>

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
