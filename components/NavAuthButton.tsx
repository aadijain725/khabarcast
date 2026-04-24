"use client";

import Link from "next/link";
import { useConvexAuth } from "convex/react";

export function NavAuthButton() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  const href = isAuthenticated ? "/dashboard" : "/login";
  const label = isLoading
    ? "…"
    : isAuthenticated
      ? "DASHBOARD"
      : "ENTER";

  return (
    <Link
      href={href}
      aria-busy={isLoading}
      className="group inline-flex items-center gap-3 font-display uppercase tracking-[0.3em] text-xs md:text-sm border border-[#D4AF37] text-[#D4AF37] px-5 py-2.5 transition-all duration-500 hover:bg-[#D4AF37] hover:text-[#0A0A0A] hover:shadow-[0_0_16px_rgba(212,175,55,0.4)]"
    >
      <span>{label}</span>
      <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-x-1">→</span>
    </Link>
  );
}
