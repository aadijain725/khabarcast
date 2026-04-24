"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { use } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { PodcastPlayer } from "../../../../components/PodcastPlayer";
import {
  TopicFlagBar,
  TranscriptTurn,
} from "../../../../components/TranscriptTurn";

const SUBTOPIC_LABEL_DISPLAY: Record<string, string> = {
  "core facts": "CORE FACTS",
  "why it matters": "WHY IT MATTERS",
  challenge: "CHALLENGE",
  "constructive takeaway": "CONSTRUCTIVE TAKEAWAY",
};

export default function EpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const episodeId = id as Id<"episodes">;
  const episode = useQuery(api.episodes.getWithAudioUrl, { episodeId });

  if (episode === undefined) {
    return (
      <div className="px-4 md:px-8 py-16 md:py-24 max-w-5xl mx-auto">
        <p className="font-display uppercase tracking-[0.3em] text-xs text-[#F2F0E4]/60">
          LOADING EPISODE…
        </p>
      </div>
    );
  }

  if (episode === null) {
    return (
      <div className="px-4 md:px-8 py-16 md:py-24 max-w-5xl mx-auto">
        <p className="font-display uppercase tracking-[0.3em] text-xs text-[#D4AF37]">
          EPISODE NOT FOUND OR NOT YOURS.
        </p>
        <Link
          href="/app"
          className="mt-6 inline-block font-display uppercase tracking-[0.3em] text-xs text-[#F2F0E4]/70 hover:text-[#D4AF37]"
        >
          ← BACK TO GENERATE
        </Link>
      </div>
    );
  }

  const audioStatusLabel = (() => {
    switch (episode.audioStatus) {
      case "ready":
        return "AUDIO READY";
      case "rendering":
        return "AUDIO RENDERING…";
      case "error":
        return `AUDIO ERROR · ${(episode.audioError ?? "unknown").slice(0, 80)}`;
      default:
        return "AUDIO NOT RENDERED";
    }
  })();

  return (
    <article className="px-4 md:px-8 py-12 md:py-20 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="deco-rule" />
        <p className="font-display uppercase tracking-[0.4em] text-[10px] md:text-xs text-[#D4AF37]">
          EPISODE
        </p>
      </div>

      <h1 className="mt-8 font-display uppercase tracking-[0.05em] leading-[0.95] text-[clamp(2rem,7vw,5rem)] text-[#F2F0E4]">
        {episode.episodeTitle}
      </h1>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#F2F0E4]/60">
        <span>FROM · {episode.sourceTitle}</span>
        <span>·</span>
        <span>{audioStatusLabel}</span>
        {episode.audioDurationSec !== undefined && (
          <>
            <span>·</span>
            <span>{Math.round(episode.audioDurationSec)}s</span>
          </>
        )}
      </div>

      {episode.audioUrl && episode.audioStatus === "ready" ? (
        <div className="mt-10">
          <PodcastPlayer
            audioUrl={episode.audioUrl}
            durationSec={episode.audioDurationSec}
          />
        </div>
      ) : (
        <div className="mt-10 border border-[#D4AF37]/30 bg-[#141414] p-6 md:p-8">
          <p className="font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#F2F0E4]/60">
            AUDIO UNAVAILABLE · {audioStatusLabel}
          </p>
        </div>
      )}

      <section className="mt-16 md:mt-20 space-y-16">
        {episode.dialogue.topics.map((topic, tIdx) => (
          <div
            key={tIdx}
            className="relative border-t border-[#D4AF37]/30 pt-10"
          >
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className="font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#D4AF37]"
              >
                {toRoman(tIdx + 1)}
              </span>
              <h2 className="font-display uppercase tracking-[0.1em] text-2xl md:text-3xl text-[#F2F0E4]">
                {topic.title}
              </h2>
            </div>

            <TopicFlagBar
              episodeId={episodeId}
              topicIndex={tIdx}
              topicTitle={topic.title}
            />

            <div className="mt-8 space-y-10">
              {topic.subtopics.map((sub, sIdx) => (
                <div key={sIdx}>
                  <p className="font-display uppercase tracking-[0.3em] text-[10px] text-[#D4AF37]/80 mb-6">
                    {SUBTOPIC_LABEL_DISPLAY[sub.label] ?? sub.label.toUpperCase()}
                  </p>
                  <div className="space-y-6">
                    {sub.turns.map((turn, turnIdx) => (
                      <TranscriptTurn
                        key={turnIdx}
                        speaker={turn.speaker}
                        text={turn.text}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </article>
  );
}

function toRoman(n: number): string {
  const map: Array<[number, string]> = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  let x = n;
  for (const [value, sym] of map) {
    while (x >= value) {
      out += sym;
      x -= value;
    }
  }
  return out;
}
