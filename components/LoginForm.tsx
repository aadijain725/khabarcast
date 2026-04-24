"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

type Status = "idle" | "redirecting" | "error";

export function LoginForm() {
  const { signIn } = useAuthActions();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleGoogle() {
    setStatus("redirecting");
    setErrorMessage("");
    try {
      await signIn("google", { redirectTo: "/dashboard" });
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message.toUpperCase() : "GOOGLE SIGN-IN FAILED."
      );
    }
  }

  const loading = status === "redirecting";

  return (
    <div className="w-full flex flex-col gap-8">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="group relative w-full border-2 border-[#D4AF37] px-8 py-6 flex items-center justify-between gap-6 text-[#D4AF37] transition-all duration-500 hover:bg-[#D4AF37] hover:text-[#0A0A0A] hover:shadow-[0_0_28px_rgba(212,175,55,0.4)] disabled:opacity-50 disabled:pointer-events-none"
      >
        <span aria-hidden="true" className="pointer-events-none absolute top-2 left-2 w-3 h-3 border-t border-l border-current opacity-60 group-hover:opacity-100 transition-opacity" />
        <span aria-hidden="true" className="pointer-events-none absolute top-2 right-2 w-3 h-3 border-t border-r border-current opacity-60 group-hover:opacity-100 transition-opacity" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-2 left-2 w-3 h-3 border-b border-l border-current opacity-60 group-hover:opacity-100 transition-opacity" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-2 right-2 w-3 h-3 border-b border-r border-current opacity-60 group-hover:opacity-100 transition-opacity" />

        <span className="flex items-center gap-4">
          <span aria-hidden="true" className="inline-flex items-center justify-center w-8 h-8 border border-current rotate-45">
            <span className="-rotate-45 font-display text-xs">G</span>
          </span>
          <span className="font-display uppercase tracking-[0.25em] text-base md:text-xl">
            {loading ? "REDIRECTING" : "CONTINUE WITH GOOGLE"}
          </span>
        </span>
        <span aria-hidden="true" className="font-display text-xl md:text-2xl transition-transform duration-500 group-hover:translate-x-1">→</span>
      </button>

      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="h-px flex-1 bg-[#D4AF37]/30" />
        <p className="font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#F2F0E4]/60 text-center">
          ONE CLICK · NO PASSWORDS · WE NEVER SEE YOUR CREDENTIALS
        </p>
        <span aria-hidden="true" className="h-px flex-1 bg-[#D4AF37]/30" />
      </div>

      {status === "error" && errorMessage && (
        <p
          role="alert"
          className="font-display uppercase tracking-[0.3em] text-xs md:text-sm text-[#D4AF37]"
        >
          ◆ {errorMessage}
        </p>
      )}
    </div>
  );
}
