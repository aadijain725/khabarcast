"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function DashboardIdentity() {
  const me = useQuery(api.users.me);

  if (me === undefined) {
    return (
      <p className="uppercase tracking-widest text-sm text-[#A1A1AA]">
        LOADING…
      </p>
    );
  }

  if (me === null) {
    return (
      <p className="uppercase tracking-widest text-sm text-[#DFE104]">
        NOT SIGNED IN.
      </p>
    );
  }

  const display = me.name ?? me.email ?? "LISTENER";

  return (
    <div className="space-y-4 md:space-y-6">
      <p className="uppercase tracking-widest text-xs md:text-sm text-[#A1A1AA]">
        SIGNED IN AS
      </p>
      <p className="font-bold uppercase tracking-tighter text-2xl md:text-4xl lg:text-5xl leading-[0.9] break-words">
        {display}
      </p>
      {me.email && me.name && (
        <p className="uppercase tracking-widest text-xs md:text-sm text-[#A1A1AA] break-words">
          {me.email}
        </p>
      )}
    </div>
  );
}
