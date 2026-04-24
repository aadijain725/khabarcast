"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      className="group inline-flex items-center gap-3 font-display uppercase tracking-[0.3em] text-xs md:text-sm border border-[#D4AF37]/70 text-[#F2F0E4] px-5 py-2.5 transition-all duration-500 hover:bg-[#1E3D59] hover:border-[#D4AF37] hover:text-[#D4AF37] disabled:opacity-50 disabled:pointer-events-none"
    >
      <span>{loading ? "SIGNING OUT" : "SIGN OUT"}</span>
      <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-x-1">→</span>
    </button>
  );
}
