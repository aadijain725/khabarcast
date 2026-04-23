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
    <div className="w-full flex flex-col gap-6">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="w-full border-2 border-[#3F3F46] px-6 md:px-8 py-5 md:py-6 flex items-center justify-between gap-6 hover:bg-[#FAFAFA] hover:text-black hover:border-[#FAFAFA] transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        <span className="font-bold uppercase tracking-tighter text-xl md:text-3xl">
          {loading ? "REDIRECTING…" : "CONTINUE WITH GOOGLE"}
        </span>
        <span className="font-bold text-xl md:text-3xl">→</span>
      </button>
      <p className="uppercase tracking-widest text-xs text-[#A1A1AA]">
        ONE CLICK. NO PASSWORDS. WE NEVER SEE YOUR GOOGLE CREDENTIALS.
      </p>
      {status === "error" && errorMessage && (
        <p
          role="alert"
          className="uppercase tracking-widest text-xs md:text-sm text-[#DFE104] font-bold"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
