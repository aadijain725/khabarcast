"use client";

import Link from "next/link";
import { useConvexAuth } from "convex/react";

export function NavAuthButton() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  const href = isAuthenticated ? "/dashboard" : "/login";
  const label = isLoading
    ? "…"
    : isAuthenticated
      ? "DASHBOARD →"
      : "LOG IN →";

  return (
    <Link
      href={href}
      aria-busy={isLoading}
      className="uppercase tracking-tighter font-bold text-xs md:text-sm border-2 border-[#3F3F46] px-4 py-2 hover:bg-[#FAFAFA] hover:text-black hover:border-[#FAFAFA] transition-colors"
    >
      {label}
    </Link>
  );
}
