"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function DashboardIdentity() {
  const me = useQuery(api.users.me);

  if (me === undefined) {
    return (
      <p className="font-display uppercase tracking-[0.3em] text-sm text-[#F2F0E4]/60">
        LOADING…
      </p>
    );
  }

  if (me === null) {
    return (
      <p className="font-display uppercase tracking-[0.3em] text-sm text-[#D4AF37]">
        NOT SIGNED IN.
      </p>
    );
  }

  const display = me.name ?? me.email ?? "LISTENER";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="w-2 h-2 rotate-45 bg-[#D4AF37]" />
        <p className="font-display uppercase tracking-[0.3em] text-xs text-[#D4AF37]">
          SIGNED IN AS
        </p>
      </div>
      <p className="font-display uppercase tracking-[0.1em] text-2xl md:text-4xl leading-tight break-words text-[#F2F0E4]">
        {display}
      </p>
      {me.email && me.name && (
        <p className="font-body tracking-wide text-sm md:text-base text-[#F2F0E4]/60 break-words">
          {me.email}
        </p>
      )}
    </div>
  );
}
