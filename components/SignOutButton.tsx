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
      className="border-2 border-[#3F3F46] px-5 md:px-6 py-2 md:py-3 font-bold uppercase tracking-tighter text-xs md:text-sm hover:bg-[#FAFAFA] hover:text-black hover:border-[#FAFAFA] transition-colors disabled:opacity-50 disabled:pointer-events-none"
    >
      {loading ? "SIGNING OUT…" : "SIGN OUT →"}
    </button>
  );
}
