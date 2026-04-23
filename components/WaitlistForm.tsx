"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

type Status = "idle" | "loading" | "success" | "already" | "error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      <div className="fade-in border-2 border-[#DFE104] bg-[#DFE104] text-black p-6 md:p-10">
        <p className="font-bold uppercase tracking-tighter text-3xl md:text-5xl leading-[0.9]">
          YOU&apos;RE IN.
        </p>
        <p className="mt-3 uppercase tracking-widest text-xs md:text-sm">
          WE&apos;LL BE IN TOUCH WHEN EARLY ACCESS OPENS.
        </p>
      </div>
    );
  }

  if (status === "already") {
    return (
      <div className="fade-in border-2 border-[#3F3F46] p-6 md:p-10">
        <p className="font-bold uppercase tracking-tighter text-3xl md:text-5xl leading-[0.9]">
          ALREADY ON THE LIST.
        </p>
        <p className="mt-3 uppercase tracking-widest text-xs md:text-sm text-[#A1A1AA]">
          SIT TIGHT — EARLY ACCESS IS COMING.
        </p>
      </div>
    );
  }

  const isLoading = status === "loading";

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      <div className="flex flex-col md:flex-row gap-4 md:gap-8 md:items-end">
        <label className="flex-1 block">
          <span className="block uppercase tracking-widest text-xs text-[#A1A1AA] mb-2">
            EMAIL
          </span>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="YOUR@EMAIL.COM"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            disabled={isLoading}
            aria-label="Email address"
            className="w-full bg-transparent border-0 border-b-2 border-[#3F3F46] px-0 py-4 md:py-6 font-bold uppercase tracking-tighter text-2xl md:text-4xl lg:text-5xl text-[#FAFAFA] placeholder:text-[#27272A] outline-none transition-colors focus:border-[#DFE104] disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          disabled={isLoading}
          className="shrink-0 bg-[#DFE104] text-black font-bold uppercase tracking-tighter text-lg md:text-xl px-8 md:px-12 py-4 md:py-6 transition-transform duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isLoading ? "JOINING…" : "JOIN →"}
        </button>
      </div>
      {status === "error" && errorMessage && (
        <p
          role="alert"
          className="mt-4 uppercase tracking-widest text-xs md:text-sm text-[#DFE104] font-bold"
        >
          {errorMessage}
        </p>
      )}
    </form>
  );
}
