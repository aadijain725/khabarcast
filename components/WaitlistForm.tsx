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
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const result = await joinWaitlist({ email: trimmed });
      if (result.alreadyJoined) {
        setStatus("already");
      } else {
        setStatus("success");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    }
  }

  if (status === "success") {
    return (
      <div className="fade-in w-full max-w-md text-center">
        <p className="font-body text-base text-[color:var(--color-amber)] font-medium">
          You&apos;re on the list.
        </p>
        <p className="font-body text-sm text-[color:var(--color-ink-muted)] mt-1">
          We&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  if (status === "already") {
    return (
      <div className="fade-in w-full max-w-md text-center">
        <p className="font-body text-base text-[color:var(--color-ink)] font-medium">
          You&apos;re already on the list.
        </p>
        <p className="font-body text-sm text-[color:var(--color-ink-muted)] mt-1">
          We&apos;ll reach out when early access opens.
        </p>
      </div>
    );
  }

  const isLoading = status === "loading";

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md" noValidate>
      <div
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0 sm:bg-white sm:border sm:border-[color:var(--color-border)] sm:rounded-full sm:p-1.5 sm:shadow-[0_1px_2px_rgba(26,23,20,0.04)] sm:transition-all sm:focus-within:border-[color:var(--color-amber)] sm:focus-within:shadow-[0_0_0_4px_rgba(232,153,60,0.12)]"
      >
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
          className="w-full bg-white border border-[color:var(--color-border)] rounded-xl px-4 py-3 font-body text-[15px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-muted)] outline-none transition-colors focus:border-[color:var(--color-amber)] disabled:opacity-60 sm:border-0 sm:bg-transparent sm:rounded-full sm:py-2 sm:pl-4 sm:flex-1 sm:focus:border-transparent"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto shrink-0 bg-[color:var(--color-amber)] text-white font-body font-medium text-[14px] tracking-tight px-5 py-3 sm:py-2.5 rounded-xl sm:rounded-full transition-all duration-150 hover:brightness-[1.05] active:brightness-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? "Joining…" : "Join Waitlist →"}
        </button>
      </div>
      {status === "error" && errorMessage && (
        <p
          role="alert"
          className="font-body text-xs text-red-600 mt-2 text-center"
        >
          {errorMessage}
        </p>
      )}
    </form>
  );
}
