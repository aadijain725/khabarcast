"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

type FlagKind = "good" | "bad" | "too-long" | "off-topic";

const KIND_LABELS: Record<FlagKind, string> = {
  good: "GOOD",
  bad: "BAD",
  "too-long": "TOO LONG",
  "off-topic": "OFF-TOPIC",
};

export function TopicFlagBar({
  episodeId,
  topicIndex,
  topicTitle,
}: {
  episodeId: Id<"episodes">;
  topicIndex: number;
  topicTitle: string;
}) {
  const createFlag = useMutation(api.topicFlags.createFlag);
  const flags = useQuery(api.topicFlags.listForEpisode, { episodeId });
  const [pending, setPending] = useState<FlagKind | null>(null);

  const existingForThisTopic = (flags ?? []).filter(
    (f) => f.topicIndex === topicIndex,
  );

  async function handle(kind: FlagKind) {
    setPending(kind);
    try {
      await createFlag({ episodeId, topicIndex, kind });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <p className="font-display uppercase tracking-[0.3em] text-[10px] text-[#F2F0E4]/50">
        FLAG {topicTitle.toUpperCase()}
      </p>
      {(Object.keys(KIND_LABELS) as FlagKind[]).map((kind) => {
        const alreadyFlagged = existingForThisTopic.some((f) => f.kind === kind);
        return (
          <button
            key={kind}
            type="button"
            onClick={() => handle(kind)}
            disabled={pending !== null}
            aria-pressed={alreadyFlagged}
            className={[
              "font-display uppercase tracking-[0.2em] text-[10px] px-3 py-1.5 border transition-colors duration-300",
              alreadyFlagged
                ? "bg-[#D4AF37] text-[#0A0A0A] border-[#D4AF37]"
                : "border-[#D4AF37]/40 text-[#F2F0E4]/70 hover:border-[#D4AF37] hover:text-[#D4AF37]",
              pending === kind ? "opacity-50" : "",
            ].join(" ")}
          >
            {KIND_LABELS[kind]}
          </button>
        );
      })}
    </div>
  );
}

export function TranscriptTurn({
  speaker,
  text,
}: {
  speaker: "KALAM" | "ANCHOR";
  text: string;
}) {
  const isKalam = speaker === "KALAM";
  return (
    <div
      className={[
        "flex gap-4 md:gap-6",
        isKalam ? "" : "flex-row-reverse text-right",
      ].join(" ")}
    >
      <div className="shrink-0 w-20 md:w-24">
        <p
          className={[
            "font-display uppercase tracking-[0.25em] text-[10px] md:text-xs",
            isKalam ? "text-[#D4AF37]" : "text-[#F2F0E4]/80",
          ].join(" ")}
        >
          {speaker}
        </p>
        <span
          aria-hidden="true"
          className={[
            "block h-px w-8 mt-2",
            isKalam ? "bg-[#D4AF37]/60" : "bg-[#F2F0E4]/30 ml-auto",
          ].join(" ")}
        />
      </div>
      <p className="flex-1 text-base md:text-lg leading-relaxed text-[#F2F0E4]/90">
        {text}
      </p>
    </div>
  );
}
