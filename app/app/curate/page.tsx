"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

export default function CuratePage() {
  const topics = useQuery(api.userTopics.listMine);
  const feeds = useQuery(api.userFeeds.listMine);
  const episodes = useQuery(api.episodes.listMine);
  const upsertTopic = useMutation(api.userTopics.upsert);
  const removeTopic = useMutation(api.userTopics.remove);
  const removeFeed = useMutation(api.userFeeds.remove);
  const runFeedback = useAction(api.agents.curator.feedback);

  const [feedbackEpisodeId, setFeedbackEpisodeId] = useState<Id<"episodes"> | null>(
    null,
  );
  const [feedbackResult, setFeedbackResult] = useState<
    { topic: string; weight: number; delta: number }[] | null
  >(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackPending, setFeedbackPending] = useState(false);

  const sortedTopics = (topics ?? []).slice().sort((a, b) => b.weight - a.weight);

  async function nudgeTopic(topic: Doc<"userTopics">, delta: number) {
    await upsertTopic({ topic: topic.topic, delta, source: "manual" });
  }

  async function runEpisodeFeedback() {
    if (!feedbackEpisodeId) return;
    setFeedbackError(null);
    setFeedbackResult(null);
    setFeedbackPending(true);
    try {
      const result = await runFeedback({ episodeId: feedbackEpisodeId });
      setFeedbackResult(result.reweightedTopics);
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : "feedback failed");
    } finally {
      setFeedbackPending(false);
    }
  }

  return (
    <section className="px-4 md:px-8 py-16 md:py-24 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="deco-rule" />
        <p className="font-display uppercase tracking-[0.4em] text-[10px] md:text-xs text-[#D4AF37]">
          CURATE · LEARN FROM USE
        </p>
      </div>

      <h1 className="mt-8 font-display uppercase tracking-[0.08em] leading-[0.95] text-[clamp(2rem,6vw,5rem)] text-[#F2F0E4]">
        TUNE YOUR
        <br />
        <span className="text-[#D4AF37]">CURATOR.</span>
      </h1>

      <p className="mt-6 max-w-2xl text-base md:text-lg text-[#F2F0E4]/75">
        The curator agent reads your topic weights when it picks articles. Pick
        an episode below to send its flags through the curator, or nudge
        weights manually.
      </p>

      <div className="mt-12 grid gap-12 md:gap-16 md:grid-cols-2">
        {/* Episode feedback panel */}
        <div>
          <h2 className="font-display uppercase tracking-[0.3em] text-xs md:text-sm text-[#D4AF37]">
            IMPROVE FROM AN EPISODE
          </h2>
          <p className="mt-3 text-sm text-[#F2F0E4]/70">
            Pick an episode you&apos;ve flagged. The curator reads its
            topicFlags and reweights matching topics in your preferences.
          </p>

          <div className="mt-5 space-y-3">
            <select
              value={feedbackEpisodeId ?? ""}
              onChange={(e) =>
                setFeedbackEpisodeId(
                  e.target.value ? (e.target.value as Id<"episodes">) : null,
                )
              }
              className="w-full bg-[#141414] border border-[#D4AF37]/30 text-[#F2F0E4] px-3 py-3 focus:border-[#D4AF37] focus:outline-none"
            >
              <option value="">— pick an episode —</option>
              {(episodes ?? []).map((e) => (
                <option key={e._id} value={e._id}>
                  {e.episodeTitle}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={runEpisodeFeedback}
              disabled={!feedbackEpisodeId || feedbackPending}
              className="w-full bg-[#D4AF37] text-[#0A0A0A] font-display uppercase tracking-[0.3em] text-xs py-3 hover:bg-[#F2F0E4] transition-colors disabled:opacity-50"
            >
              {feedbackPending ? "RUNNING CURATOR…" : "RUN CURATOR FEEDBACK"}
            </button>

            {feedbackError && (
              <p className="text-sm text-red-400 border border-red-500/30 bg-red-500/5 px-3 py-2">
                {feedbackError}
              </p>
            )}

            {feedbackResult && feedbackResult.length === 0 && (
              <p className="text-sm text-[#F2F0E4]/60 border border-[#D4AF37]/20 bg-[#141414] px-3 py-2">
                no flags found on this episode — nothing to learn from yet.
              </p>
            )}

            {feedbackResult && feedbackResult.length > 0 && (
              <div className="border border-[#D4AF37]/30 bg-[#141414] p-4">
                <p className="font-display uppercase tracking-[0.3em] text-[10px] text-[#D4AF37] mb-3">
                  REWEIGHTED
                </p>
                <ul className="space-y-2">
                  {feedbackResult.map((r) => (
                    <li
                      key={r.topic}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <span className="text-[#F2F0E4]/85">{r.topic}</span>
                      <span
                        className={`font-mono text-xs ${
                          r.delta >= 0 ? "text-[#D4AF37]" : "text-red-400"
                        }`}
                      >
                        {r.delta >= 0 ? "+" : ""}
                        {r.delta} → weight {r.weight}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Manual topic + feed editing */}
        <div>
          <h2 className="font-display uppercase tracking-[0.3em] text-xs md:text-sm text-[#D4AF37]">
            TOPICS
          </h2>

          {topics === undefined && (
            <p className="mt-4 font-display uppercase tracking-[0.3em] text-xs text-[#F2F0E4]/60">
              LOADING…
            </p>
          )}

          {topics && topics.length === 0 && (
            <p className="mt-4 text-sm text-[#F2F0E4]/65">
              No topics yet.{" "}
              <Link href="/app/onboarding" className="underline text-[#D4AF37]">
                run onboarding
              </Link>
              .
            </p>
          )}

          {sortedTopics.length > 0 && (
            <ul className="mt-4 space-y-2">
              {sortedTopics.map((t) => (
                <li
                  key={t._id}
                  className="border border-[#D4AF37]/20 bg-[#141414] px-3 py-2 flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="text-[#F2F0E4]/90 truncate">{t.topic}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs text-[#F2F0E4]/60 w-10 text-right">
                      w {t.weight}
                    </span>
                    <button
                      type="button"
                      onClick={() => nudgeTopic(t, +1)}
                      className="border border-[#D4AF37]/30 px-2 py-0.5 text-[#D4AF37] hover:border-[#D4AF37] text-xs"
                      aria-label="more like this"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeTopic(t, -1)}
                      className="border border-[#D4AF37]/30 px-2 py-0.5 text-[#F2F0E4]/70 hover:border-red-400 hover:text-red-400 text-xs"
                      aria-label="less like this"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTopic({ topicId: t._id })}
                      className="border border-[#D4AF37]/30 px-2 py-0.5 text-[#F2F0E4]/55 hover:border-red-500/60 hover:text-red-400 text-xs"
                      aria-label="remove"
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-10 font-display uppercase tracking-[0.3em] text-xs md:text-sm text-[#D4AF37]">
            FEEDS
          </h2>

          {feeds && feeds.length === 0 && (
            <p className="mt-4 text-sm text-[#F2F0E4]/65">No feeds yet.</p>
          )}

          {feeds && feeds.length > 0 && (
            <ul className="mt-4 space-y-2">
              {feeds.map((f) => (
                <li
                  key={f._id}
                  className="border border-[#D4AF37]/20 bg-[#141414] px-3 py-2 flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block text-[#F2F0E4]/90 truncate">
                      {f.title ?? f.handle}
                    </span>
                    <span className="block font-mono text-[10px] text-[#F2F0E4]/45">
                      {f.kind} · {f.handle}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFeed({ feedId: f._id })}
                    className="border border-[#D4AF37]/30 px-2 py-0.5 text-[#F2F0E4]/55 hover:border-red-500/60 hover:text-red-400 text-xs shrink-0"
                    aria-label="remove"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/app/onboarding"
            className="mt-6 inline-flex items-center gap-2 font-display uppercase tracking-[0.3em] text-[10px] text-[#D4AF37] hover:text-[#F2F0E4] transition-colors"
          >
            <span>ADD MORE FEEDS</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
