"use client";

import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

function formatWhen(ts: number): string {
  const d = new Date(ts);
  const month = d
    .toLocaleString("en-US", { month: "short" })
    .toUpperCase();
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day} ${year}`;
}

function audioLabel(
  status: string | undefined,
  durationSec: number | undefined,
): string {
  if (status === "ready" && durationSec !== undefined) {
    const min = Math.floor(durationSec / 60);
    const sec = Math.round(durationSec % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }
  if (status === "rendering") return "RENDERING…";
  if (status === "error") return "ERROR";
  return "NO AUDIO";
}

function RetryAudioButton({ episodeId }: { episodeId: Id<"episodes"> }) {
  const reRender = useAction(api.pipeline.renderAudio.run);
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "pending" } | { kind: "error" }
  >({ kind: "idle" });
  return (
    <button
      type="button"
      disabled={state.kind === "pending"}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setState({ kind: "pending" });
        try {
          await reRender({ episodeId });
          setState({ kind: "idle" });
        } catch {
          setState({ kind: "error" });
        }
      }}
      className="font-display uppercase tracking-[0.25em] text-[10px] px-3 py-1 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      aria-label="retry audio render"
    >
      {state.kind === "pending"
        ? "RETRYING…"
        : state.kind === "error"
          ? "↻ FAILED · RETRY"
          : "↻ RETRY AUDIO"}
    </button>
  );
}

export default function HistoryPage() {
  const episodes = useQuery(api.episodes.listMine);

  return (
    <section className="px-4 md:px-8 py-16 md:py-24 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="deco-rule" />
        <p className="font-display uppercase tracking-[0.4em] text-[10px] md:text-xs text-[#D4AF37]">
          HISTORY · YOUR EPISODES
        </p>
      </div>

      <h1 className="mt-8 font-display uppercase tracking-[0.08em] leading-[0.95] text-[clamp(2rem,6vw,5rem)] text-[#F2F0E4]">
        EVERY SHOW
        <br />
        <span className="text-[#D4AF37]">YOU&apos;VE MADE.</span>
      </h1>

      <div className="mt-12 md:mt-16">
        {episodes === undefined && (
          <p className="font-display uppercase tracking-[0.3em] text-xs text-[#F2F0E4]/60">
            LOADING…
          </p>
        )}

        {episodes && episodes.length === 0 && (
          <div className="border border-[#D4AF37]/30 bg-[#141414] p-8 md:p-10">
            <p className="font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#D4AF37]">
              NOTHING YET
            </p>
            <p className="mt-4 text-base md:text-lg text-[#F2F0E4]/75">
              Generate your first episode from the main screen.
            </p>
            <Link
              href="/app"
              className="mt-6 inline-flex items-center gap-2 font-display uppercase tracking-[0.3em] text-xs text-[#D4AF37] hover:text-[#F2F0E4] transition-colors"
            >
              <span>GO TO GENERATE</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}

        {episodes && episodes.length > 0 && (
          <ul className="divide-y divide-[#D4AF37]/20 border-t border-b border-[#D4AF37]/20">
            {episodes.map((ep) => (
              <li
                key={ep._id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-6 py-6 md:py-8"
              >
                <Link
                  href={`/app/episodes/${ep._id}`}
                  className="group min-w-0 flex-1"
                >
                  <h2 className="font-display uppercase tracking-[0.08em] text-xl md:text-3xl text-[#F2F0E4] group-hover:text-[#D4AF37] transition-colors break-words">
                    {ep.episodeTitle}
                  </h2>
                  <p className="mt-2 text-sm text-[#F2F0E4]/60">
                    FROM · {ep.sourceTitle}
                  </p>
                </Link>
                <div className="shrink-0 flex items-center gap-4 font-display uppercase tracking-[0.3em] text-[10px] md:text-xs">
                  <span className="text-[#F2F0E4]/50">
                    {formatWhen(ep._creationTime)}
                  </span>
                  <span className="text-[#D4AF37]">
                    {audioLabel(ep.audioStatus, ep.audioDurationSec)}
                  </span>
                  {ep.audioStatus !== "ready" &&
                    ep.audioStatus !== "rendering" && (
                      <RetryAudioButton episodeId={ep._id} />
                    )}
                  <Link
                    href={`/app/episodes/${ep._id}`}
                    className="text-[#D4AF37] hover:translate-x-1 transition-transform"
                    aria-label="open episode"
                  >
                    →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
