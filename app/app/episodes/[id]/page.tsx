"use client";

import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
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
  const router = useRouter();
  const { id } = use(params);
  const episodeId = id as Id<"episodes">;
  const episode = useQuery(api.episodes.getWithAudioUrl, { episodeId });
  const hosts = useQuery(api.hosts.listVisible);
  const reRenderAudio = useAction(api.pipeline.renderAudio.run);
  const regenerateEpisode = useAction(api.agents.manager.regenerateEpisode);

  const [reRenderState, setReRenderState] = useState<
    { kind: "idle" } | { kind: "pending" } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [regenOpen, setRegenOpen] = useState(false);
  const [pickedKalam, setPickedKalam] = useState<Id<"hosts"> | "">("");
  const [pickedAnchor, setPickedAnchor] = useState<Id<"hosts"> | "">("");
  const [regenState, setRegenState] = useState<
    { kind: "idle" } | { kind: "pending" } | { kind: "error"; message: string }
  >({ kind: "idle" });

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

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={
            reRenderState.kind === "pending" ||
            episode.audioStatus === "rendering"
          }
          onClick={async () => {
            setReRenderState({ kind: "pending" });
            try {
              await reRenderAudio({ episodeId });
              setReRenderState({ kind: "idle" });
            } catch (err) {
              setReRenderState({
                kind: "error",
                message: err instanceof Error ? err.message : String(err),
              });
            }
          }}
          className="font-display uppercase tracking-[0.3em] text-[10px] md:text-xs px-5 py-3 border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {reRenderState.kind === "pending" || episode.audioStatus === "rendering"
            ? "RE-RENDERING…"
            : "↻ RE-RENDER AUDIO"}
        </button>

        <button
          type="button"
          onClick={() => {
            const nextOpen = !regenOpen;
            setRegenOpen(nextOpen);
            if (nextOpen && episode.hostMapping) {
              setPickedKalam(episode.hostMapping.KALAM);
              setPickedAnchor(episode.hostMapping.ANCHOR);
            }
          }}
          className="font-display uppercase tracking-[0.3em] text-[10px] md:text-xs px-5 py-3 border border-[#F2F0E4]/30 text-[#F2F0E4]/80 hover:border-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors"
        >
          {regenOpen ? "× CLOSE" : "REGENERATE WITH NEW HOSTS"}
        </button>
      </div>

      {reRenderState.kind === "error" && (
        <p className="mt-3 font-display uppercase tracking-[0.2em] text-[10px] text-red-400">
          RE-RENDER FAILED · {reRenderState.message.slice(0, 120)}
        </p>
      )}

      {regenOpen && (
        <div className="mt-6 border border-[#D4AF37]/30 bg-[#141414] p-6 md:p-8">
          <p className="font-display uppercase tracking-[0.3em] text-[10px] text-[#F2F0E4]/60">
            PICK A NEW HOST PAIR · COMPOSER WILL PULL FRESH IDEOLOGIES FROM THE SAME SOURCE
          </p>

          {hosts === undefined ? (
            <p className="mt-4 font-display uppercase tracking-[0.3em] text-[10px] text-[#F2F0E4]/50">
              LOADING HOSTS…
            </p>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="font-display uppercase tracking-[0.3em] text-[10px] text-[#D4AF37]">
                  MAIN SPEAKER · KALAM SLOT
                </span>
                <select
                  value={pickedKalam}
                  onChange={(e) =>
                    setPickedKalam(e.target.value as Id<"hosts">)
                  }
                  className="bg-[#0d0d0d] border border-[#D4AF37]/30 text-[#F2F0E4] px-3 py-2 font-display tracking-[0.05em] text-sm"
                >
                  <option value="">— select host —</option>
                  {hosts
                    .filter((h) => h.slot === "KALAM")
                    .map((h) => (
                      <option key={h._id} value={h._id}>
                        {h.name}
                      </option>
                    ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-display uppercase tracking-[0.3em] text-[10px] text-[#D4AF37]">
                  HOST · ANCHOR SLOT
                </span>
                <select
                  value={pickedAnchor}
                  onChange={(e) =>
                    setPickedAnchor(e.target.value as Id<"hosts">)
                  }
                  className="bg-[#0d0d0d] border border-[#D4AF37]/30 text-[#F2F0E4] px-3 py-2 font-display tracking-[0.05em] text-sm"
                >
                  <option value="">— select host —</option>
                  {hosts
                    .filter((h) => h.slot === "ANCHOR")
                    .map((h) => (
                      <option key={h._id} value={h._id}>
                        {h.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled={
                regenState.kind === "pending" ||
                pickedKalam === "" ||
                pickedAnchor === ""
              }
              onClick={async () => {
                if (pickedKalam === "" || pickedAnchor === "") return;
                setRegenState({ kind: "pending" });
                try {
                  const result = await regenerateEpisode({
                    fromEpisodeId: episodeId,
                    kalamHostId: pickedKalam,
                    anchorHostId: pickedAnchor,
                  });
                  router.push(`/app/episodes/${result.episodeId}`);
                } catch (err) {
                  setRegenState({
                    kind: "error",
                    message: err instanceof Error ? err.message : String(err),
                  });
                }
              }}
              className="font-display uppercase tracking-[0.3em] text-[10px] md:text-xs px-5 py-3 bg-[#D4AF37] text-[#0d0d0d] hover:bg-[#F2F0E4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {regenState.kind === "pending" ? "REGENERATING…" : "GENERATE NEW EPISODE"}
            </button>
            {regenState.kind === "error" && (
              <span className="font-display uppercase tracking-[0.2em] text-[10px] text-red-400">
                FAILED · {regenState.message.slice(0, 120)}
              </span>
            )}
          </div>
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
