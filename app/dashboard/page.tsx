import Link from "next/link";
import { DashboardIdentity } from "../../components/DashboardIdentity";
import { SignOutButton } from "../../components/SignOutButton";

export default function DashboardPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-40 bg-[#09090B] border-b-2 border-[#3F3F46]">
        <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <Link
            href="/"
            className="font-bold uppercase tracking-tighter text-base md:text-lg hover:text-[#DFE104] transition-colors"
          >
            KHABARCAST<span className="text-[#DFE104]">.</span>
          </Link>
          <SignOutButton />
        </div>
      </nav>

      <section className="flex-1 px-4 md:px-8 py-16 md:py-32">
        <p className="uppercase tracking-widest text-xs md:text-sm text-[#A1A1AA] mb-6 md:mb-10">
          [ DASHBOARD · PREVIEW ]
        </p>
        <h1 className="font-bold uppercase tracking-tighter leading-[0.85] text-[clamp(3rem,12vw,12rem)] mb-12 md:mb-20">
          YOU&apos;RE
          <br />
          <span className="text-[#DFE104]">IN.</span>
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          <div className="border-2 border-[#3F3F46] p-6 md:p-10">
            <DashboardIdentity />
          </div>
          <div className="border-2 border-[#3F3F46] p-6 md:p-10">
            <p className="uppercase tracking-widest text-xs md:text-sm text-[#A1A1AA] mb-4">
              WHAT&apos;S NEXT
            </p>
            <p className="text-lg md:text-xl lg:text-2xl leading-tight text-[#FAFAFA]">
              Your audio briefings feed lands here soon. Early access opens in
              waves — you&apos;ll get an email when yours unlocks.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t-2 border-[#3F3F46] px-4 md:px-8 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:justify-between gap-2 text-xs uppercase tracking-widest text-[#A1A1AA]">
          <span>© 2026 KHABARCAST</span>
          <span>AUDIO BRIEFINGS FOR YOUR FEED</span>
        </div>
      </footer>
    </main>
  );
}
