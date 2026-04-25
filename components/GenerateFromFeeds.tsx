"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";

const PHASES = [
  { from: 0, label: "ROUTING" },
  { from: 2, label: "RESEARCHING FEEDS" },
  { from: 8, label: "DRAFTING IDEOLOGIES" },
  { from: 25, label: "COMPOSING DIALOGUE" },
  { from: 80, label: "RENDERING AUDIO" },
];

function phaseFor(elapsedMs: number): string {
  const sec = Math.floor(elapsedMs / 1000);
  let label = PHASES[0].label;
  for (const p of PHASES) if (sec >= p.from) label = p.label;
  return label;
}

function pickDefault(
  hosts: Doc<"hosts">[],
  slot: "KALAM" | "ANCHOR",
): Id<"hosts"> | undefined {
  return hosts.find((h) => h.slot === slot)?._id;
}

export function GenerateFromFeeds() {
  const router = useRouter();
  const hosts = useQuery(api.hosts.listVisible);
  const feeds = useQuery(api.userFeeds.listMine);
  const topics = useQuery(api.userTopics.listMine);
  const generate = useAction(api.agents.manager.generateEpisode);

  const kalams = hosts?.filter((h) => h.slot === "KALAM") ?? [];
  const anchors = hosts?.filter((h) => h.slot === "ANCHOR") ?? [];

  // Selected = user override; falls back to first-host-in-slot when undefined.
  const [kalamOverride, setKalamOverride] = useState<Id<"hosts"> | undefined>();
  const [anchorOverride, setAnchorOverride] = useState<Id<"hosts"> | undefined>();
  const kalamId = kalamOverride ?? (hosts ? pickDefault(hosts, "KALAM") : undefined);
  const anchorId = anchorOverride ?? (hosts ? pickDefault(hosts, "ANCHOR") : undefined);

  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Tick clock while running. The interval callback is async; eslint's
  // set-state-in-effect rule fires on synchronous setState — interval callbacks
  // are not synchronous so the disable below is targeted.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const elapsed = running && startedAt && now ? Math.max(0, now - startedAt) : 0;
  const noFeeds = feeds?.length === 0;

  async function onGenerate() {
    if (!kalamId || !anchorId) {
      setError("pick a host for each slot");
      return;
    }
    setError(null);
    setRunning(true);
    setStartedAt(Date.now());
    try {
      const result = await generate({ kalamHostId: kalamId, anchorHostId: anchorId });
      router.push(`/app/episodes/${result.episodeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "generation failed");
      setRunning(false);
      setStartedAt(null);
    }
  }

  if (hosts === undefined || feeds === undefined || topics === undefined) {
    return (
      <p className="font-display uppercase tracking-[0.3em] text-xs text-[#F2F0E4]/60">
        LOADING…
      </p>
    );
  }

  if (noFeeds) {
    return (
      <div className="border border-[#D4AF37]/40 bg-[#141414] p-6 md:p-8">
        <p className="font-display uppercase tracking-[0.3em] text-[10px] text-[#D4AF37]">
          ONBOARDING REQUIRED
        </p>
        <p className="mt-3 text-base md:text-lg text-[#F2F0E4]/85">
          Add at least one newsletter to your feed list before generating.
        </p>
        <Link
          href="/app/onboarding"
          className="mt-5 inline-flex items-center gap-2 bg-[#D4AF37] text-[#0A0A0A] font-display uppercase tracking-[0.3em] text-xs px-5 py-3 hover:bg-[#F2F0E4] transition-colors"
        >
          <span>SET UP YOUR FEEDS</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        <SlotPicker
          label="KALAM SLOT"
          hosts={kalams}
          selected={kalamId}
          onSelect={setKalamOverride}
        />
        <SlotPicker
          label="ANCHOR SLOT"
          hosts={anchors}
          selected={anchorId}
          onSelect={setAnchorOverride}
        />
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
        <p className="font-display uppercase tracking-[0.3em] text-[#F2F0E4]/55">
          USING {feeds?.length ?? 0} FEED{feeds?.length === 1 ? "" : "S"} ·{" "}
          {topics?.length ?? 0} TOPIC{topics?.length === 1 ? "" : "S"}
        </p>
        <div className="flex gap-4">
          <Link
            href="/app/onboarding"
            className="font-display uppercase tracking-[0.3em] text-[#D4AF37]/80 hover:text-[#D4AF37] transition-colors"
          >
            EDIT FEEDS →
          </Link>
          <Link
            href="/app/hosts"
            className="font-display uppercase tracking-[0.3em] text-[#D4AF37]/80 hover:text-[#D4AF37] transition-colors"
          >
            EDIT HOSTS →
          </Link>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 border border-red-500/30 bg-red-500/5 px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onGenerate}
        disabled={running || !kalamId || !anchorId}
        className="w-full bg-[#D4AF37] text-[#0A0A0A] font-display uppercase tracking-[0.3em] text-sm md:text-base px-6 py-4 hover:bg-[#F2F0E4] transition-colors disabled:opacity-50"
      >
        {running ? "AGENTS WORKING…" : "GENERATE EPISODE"}
      </button>

      {running && (
        <div className="border border-[#D4AF37]/30 bg-[#141414] p-4 md:p-5 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display uppercase tracking-[0.3em] text-xs text-[#D4AF37]">
              {phaseFor(elapsed)}
            </p>
            <p className="font-mono text-sm text-[#F2F0E4]/70">
              {Math.floor(elapsed / 1000)}s
            </p>
          </div>
          <p className="text-xs text-[#F2F0E4]/60">
            Watch live in{" "}
            <Link
              href="/app/runs"
              className="underline text-[#D4AF37] hover:text-[#F2F0E4]"
            >
              /app/runs
            </Link>{" "}
            — manager → researcher → composer (with 2 ideology agents) → audio.
          </p>
        </div>
      )}
    </div>
  );
}

function SlotPicker({
  label,
  hosts,
  selected,
  onSelect,
}: {
  label: string;
  hosts: Doc<"hosts">[];
  selected: Id<"hosts"> | undefined;
  onSelect: (id: Id<"hosts">) => void;
}) {
  return (
    <div>
      <p className="font-display uppercase tracking-[0.3em] text-[10px] text-[#D4AF37]/80 mb-2">
        {label}
      </p>
      {hosts.length === 0 ? (
        <p className="text-sm text-[#F2F0E4]/60 border border-[#D4AF37]/30 bg-[#141414] p-3">
          No hosts in this slot.{" "}
          <Link href="/app/hosts" className="underline text-[#D4AF37]">
            add one
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-2">
          {hosts.map((h) => (
            <button
              key={h._id}
              type="button"
              onClick={() => onSelect(h._id)}
              className={`w-full text-left border px-3 py-3 transition-colors ${
                selected === h._id
                  ? "border-[#D4AF37] bg-[#D4AF37]/10"
                  : "border-[#D4AF37]/30 hover:border-[#D4AF37]/60"
              }`}
            >
              <p className="font-display uppercase tracking-[0.08em] text-sm text-[#F2F0E4]">
                {h.name}
              </p>
              <p className="mt-1 text-xs text-[#F2F0E4]/65 line-clamp-2">{h.persona}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
