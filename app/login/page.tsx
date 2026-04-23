import Link from "next/link";
import { LoginForm } from "../../components/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Top bar */}
      <nav className="border-b-2 border-[#3F3F46]">
        <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <Link
            href="/"
            className="font-bold uppercase tracking-tighter text-base md:text-lg hover:text-[#DFE104] transition-colors"
          >
            ← KHABARCAST<span className="text-[#DFE104]">.</span>
          </Link>
          <span className="uppercase tracking-widest text-xs text-[#A1A1AA]">
            [ SIGN IN ]
          </span>
        </div>
      </nav>

      <div className="flex-1 px-4 md:px-8 py-16 md:py-32 flex flex-col justify-center">
        <div className="max-w-4xl">
          <p className="uppercase tracking-widest text-xs md:text-sm text-[#A1A1AA] mb-6 md:mb-10">
            [ WELCOME BACK ]
          </p>
          <h1 className="font-bold uppercase tracking-tighter leading-[0.85] text-[clamp(3rem,12vw,12rem)] mb-12 md:mb-20">
            LOG
            <br />
            <span className="text-[#DFE104]">IN.</span>
          </h1>

          <LoginForm />

          <p className="mt-12 md:mt-16 uppercase tracking-widest text-xs text-[#A1A1AA]">
            NEW HERE? THE SAME LINK CREATES YOUR ACCOUNT. NO EXTRA STEP.
          </p>
        </div>
      </div>

      <footer className="border-t-2 border-[#3F3F46] px-4 md:px-8 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:justify-between gap-2 text-xs uppercase tracking-widest text-[#A1A1AA]">
          <span>© 2026 KHABARCAST</span>
          <span>AUDIO BRIEFINGS FOR YOUR FEED</span>
        </div>
      </footer>
    </main>
  );
}
