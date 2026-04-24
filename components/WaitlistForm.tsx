"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

type Status = "idle" | "loading" | "success" | "already" | "error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Corner L-brackets — placed absolutely by parent */
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

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const joinWaitlist = useMutation(api.waitlist.joinWaitlist);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(trimmed)) {
      setStatus("error");
      setErrorMessage("ENTER A VALID EMAIL.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const result = await joinWaitlist({ email: trimmed });
      setStatus(result.alreadyJoined ? "already" : "success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message.toUpperCase() : "SOMETHING BROKE. TRY AGAIN."
      );
    }
  }

  if (status === "success") {
    return (
      <div className="fade-in relative bg-[#141414] border-2 border-[#D4AF37] p-10 deco-glow">
        <CornerBrackets />
        <div className="flex items-center justify-center gap-4 mb-6">
          <span aria-hidden="true" className="h-px w-10 bg-[#D4AF37]" />
          <span aria-hidden="true" className="w-3 h-3 rotate-45 bg-[#D4AF37]" />
          <span aria-hidden="true" className="h-px w-10 bg-[#D4AF37]" />
        </div>
        <p className="font-display uppercase tracking-[0.15em] text-3xl md:text-5xl text-[#D4AF37] leading-tight">
          YOU ARE IN.
        </p>
        <p className="mt-5 font-display uppercase tracking-[0.3em] text-xs md:text-sm text-[#F2F0E4]/70">
          WE WILL BE IN TOUCH WHEN EARLY ACCESS OPENS.
        </p>
      </div>
    );
  }

  if (status === "already") {
    return (
      <div className="fade-in relative bg-[#141414] border border-[#D4AF37]/60 p-10">
        <CornerBrackets />
        <p className="font-display uppercase tracking-[0.15em] text-3xl md:text-5xl text-[#F2F0E4] leading-tight">
          ALREADY ENLISTED.
        </p>
        <p className="mt-5 font-display uppercase tracking-[0.3em] text-xs md:text-sm text-[#F2F0E4]/60">
          SIT TIGHT — EARLY ACCESS IS COMING.
        </p>
      </div>
    );
  }

  const isLoading = status === "loading";

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      <div className="flex flex-col md:flex-row gap-6 md:gap-10 md:items-end">
        <label className="flex-1 block text-left">
          <span className="block font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#D4AF37] mb-3">
            EMAIL ADDRESS
          </span>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            disabled={isLoading}
            aria-label="Email address"
            className="w-full bg-transparent border-0 border-b-2 border-[#D4AF37] px-0 py-3 md:py-4 font-body text-lg md:text-2xl text-[#F2F0E4] placeholder:text-[#888888] placeholder:lowercase outline-none transition-all focus:border-[#F2E8C4] focus:shadow-[0_4px_10px_rgba(212,175,55,0.25)] disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          disabled={isLoading}
          className="group shrink-0 relative inline-flex items-center gap-3 border-2 border-[#D4AF37] text-[#D4AF37] font-display uppercase tracking-[0.3em] text-sm px-8 py-4 transition-all duration-500 hover:bg-[#D4AF37] hover:text-[#0A0A0A] hover:shadow-[0_0_20px_rgba(212,175,55,0.45)] disabled:opacity-50 disabled:pointer-events-none"
        >
          <span>{isLoading ? "JOINING" : "JOIN"}</span>
          <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-x-1">→</span>
        </button>
      </div>
      {status === "error" && errorMessage && (
        <p
          role="alert"
          className="mt-5 font-display uppercase tracking-[0.3em] text-xs text-[#D4AF37]"
        >
          ◆ {errorMessage}
        </p>
      )}
    </form>
  );
}
