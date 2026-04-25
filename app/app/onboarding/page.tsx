"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

type FeedSuggestion = { kind: "substack" | "rss"; handle: string; title: string };

export default function OnboardingPage() {
  const router = useRouter();
  const onboard = useAction(api.agents.manager.onboard);
  const addFeed = useMutation(api.userFeeds.add);
  const upsertTopic = useMutation(api.userTopics.upsert);
  const existingFeeds = useQuery(api.userFeeds.listMine);
  const existingTopics = useQuery(api.userTopics.listMine);

  const [substackHandle, setSubstackHandle] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<{
    feeds: FeedSuggestion[];
    topics: string[];
  } | null>(null);
  const [selectedFeeds, setSelectedFeeds] = useState<Set<string>>(new Set());
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());

  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  async function onDiscover(e: FormEvent) {
    e.preventDefault();
    setDiscoverError(null);
    setDiscovering(true);
    try {
      const handle = substackHandle.trim().replace(/^@/, "");
      const result = await onboard({ substackHandle: handle || undefined });
      setSuggestions({ feeds: result.feedsDiscovered, topics: result.suggestedTopics });
      setSelectedFeeds(new Set(result.feedsDiscovered.map((f) => f.handle)));
      setSelectedTopics(new Set(result.suggestedTopics));
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : "discover failed");
    } finally {
      setDiscovering(false);
    }
  }

  async function onCommit() {
    if (!suggestions) return;
    setCommitError(null);
    setCommitting(true);
    try {
      for (const f of suggestions.feeds.filter((s) => selectedFeeds.has(s.handle))) {
        await addFeed({ kind: f.kind, handle: f.handle, title: f.title });
      }
      for (const t of suggestions.topics.filter((s) => selectedTopics.has(s))) {
        await upsertTopic({ topic: t, source: "onboarding" });
      }
      router.push("/app");
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : "commit failed");
    } finally {
      setCommitting(false);
    }
  }

  function toggleFeed(handle: string) {
    setSelectedFeeds((s) => {
      const next = new Set(s);
      if (next.has(handle)) next.delete(handle);
      else next.add(handle);
      return next;
    });
  }

  function toggleTopic(topic: string) {
    setSelectedTopics((s) => {
      const next = new Set(s);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  }

  return (
    <section className="px-4 md:px-8 py-16 md:py-24 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="deco-rule" />
        <p className="font-display uppercase tracking-[0.4em] text-[10px] md:text-xs text-[#D4AF37]">
          ONBOARDING · CONNECT YOUR FEED
        </p>
      </div>

      <h1 className="mt-8 font-display uppercase tracking-[0.08em] leading-[0.95] text-[clamp(2rem,6vw,5rem)] text-[#F2F0E4]">
        WHAT DO YOU
        <br />
        <span className="text-[#D4AF37]">ALREADY READ?</span>
      </h1>

      <p className="mt-6 max-w-2xl text-base md:text-lg text-[#F2F0E4]/75">
        Drop your substack handle and the curator agent scrapes your reads,
        clusters them into topic buckets, and proposes a starting set. Skip the
        handle to use a curated default list.
      </p>

      {(existingFeeds?.length ?? 0) > 0 && (
        <p className="mt-4 text-sm text-[#F2F0E4]/55">
          You already have {existingFeeds?.length} feed
          {existingFeeds?.length === 1 ? "" : "s"} and {existingTopics?.length} topic
          {existingTopics?.length === 1 ? "" : "s"}. Run again to add more.
        </p>
      )}

      <form onSubmit={onDiscover} className="mt-8 flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <label className="block font-display uppercase tracking-[0.3em] text-[10px] text-[#D4AF37]/80 mb-2">
            SUBSTACK HANDLE (OPTIONAL)
          </label>
          <input
            value={substackHandle}
            onChange={(e) => setSubstackHandle(e.target.value)}
            placeholder="e.g. noahpinion (no @, no .substack.com)"
            className="w-full bg-[#141414] border border-[#D4AF37]/30 text-[#F2F0E4] px-3 py-3 focus:border-[#D4AF37] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={discovering}
          className="md:self-end bg-[#D4AF37] text-[#0A0A0A] font-display uppercase tracking-[0.3em] text-xs px-6 py-3 hover:bg-[#F2F0E4] transition-colors disabled:opacity-50"
        >
          {discovering ? "SCRAPING…" : "DISCOVER"}
        </button>
      </form>

      {discoverError && (
        <p className="mt-3 text-sm text-red-400 border border-red-500/30 bg-red-500/5 px-3 py-2">
          {discoverError}
        </p>
      )}

      {suggestions && (
        <div className="mt-12 space-y-12">
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="font-display uppercase tracking-[0.3em] text-xs text-[#D4AF37]">
                FEEDS — {suggestions.feeds.length} FOUND
              </p>
              <p className="font-display uppercase tracking-[0.3em] text-[10px] text-[#F2F0E4]/55">
                {selectedFeeds.size} SELECTED
              </p>
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              {suggestions.feeds.map((f) => {
                const on = selectedFeeds.has(f.handle);
                return (
                  <li key={f.handle}>
                    <button
                      type="button"
                      onClick={() => toggleFeed(f.handle)}
                      className={`w-full text-left border px-4 py-3 transition-colors ${
                        on
                          ? "border-[#D4AF37] bg-[#D4AF37]/10"
                          : "border-[#D4AF37]/30 hover:border-[#D4AF37]/60"
                      }`}
                    >
                      <p className="font-display uppercase tracking-[0.08em] text-sm text-[#F2F0E4]">
                        {f.title}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-[#F2F0E4]/55">
                        @{f.handle} · {f.kind}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="font-display uppercase tracking-[0.3em] text-xs text-[#D4AF37]">
                TOPICS — CLUSTERED
              </p>
              <p className="font-display uppercase tracking-[0.3em] text-[10px] text-[#F2F0E4]/55">
                {selectedTopics.size} SELECTED
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.topics.map((t) => {
                const on = selectedTopics.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTopic(t)}
                    className={`border px-4 py-2 text-sm transition-colors ${
                      on
                        ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#F2F0E4]"
                        : "border-[#D4AF37]/30 text-[#F2F0E4]/70 hover:border-[#D4AF37]/60"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {commitError && (
            <p className="text-sm text-red-400 border border-red-500/30 bg-red-500/5 px-3 py-2">
              {commitError}
            </p>
          )}

          <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-[#D4AF37]/20">
            <button
              type="button"
              onClick={onCommit}
              disabled={
                committing ||
                (selectedFeeds.size === 0 && selectedTopics.size === 0)
              }
              className="bg-[#D4AF37] text-[#0A0A0A] font-display uppercase tracking-[0.3em] text-xs px-6 py-3 hover:bg-[#F2F0E4] transition-colors disabled:opacity-50"
            >
              {committing ? "SAVING…" : "SAVE & GO TO GENERATE"}
            </button>
            <Link
              href="/app"
              className="font-display uppercase tracking-[0.3em] text-[10px] text-[#F2F0E4]/55 hover:text-[#D4AF37] transition-colors self-center"
            >
              SKIP FOR NOW →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
