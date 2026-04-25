"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

type ValidatedFeed = {
  kind: "substack" | "rss";
  handle: string;
  title: string;
  feedUrl: string;
};

type RejectedLine = { line: string; reason: string };

// Hand-curated topic chips. Mirrors `convex/connectors/topicCatalog.ts`.
// Keep in sync if you edit either side. Server is the source of truth — these
// are just labels for the chip UI.
const STARTER_TOPICS = [
  "ai and machine learning",
  "macro economics and policy",
  "rationality and science writing",
  "geopolitics and global affairs",
  "culture and society",
  "startups and tech industry",
];

type Mode = "feeds" | "topics";

export default function OnboardingPage() {
  const router = useRouter();
  const onboard = useAction(api.agents.manager.onboard);
  const suggestFromTopics = useAction(api.agents.manager.suggestFromTopics);
  const addFeed = useMutation(api.userFeeds.add);
  const upsertTopic = useMutation(api.userTopics.upsert);
  const existingFeeds = useQuery(api.userFeeds.listMine);
  const existingTopics = useQuery(api.userTopics.listMine);

  const [mode, setMode] = useState<Mode>("feeds");

  // mode A state
  const [feedLinesText, setFeedLinesText] = useState("");

  // mode B state
  const [pickedTopics, setPickedTopics] = useState<Set<string>>(new Set());

  // shared submit + result state
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [validated, setValidated] = useState<ValidatedFeed[] | null>(null);
  const [rejected, setRejected] = useState<RejectedLine[]>([]);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);

  // selection state for the commit step
  const [selectedFeeds, setSelectedFeeds] = useState<Set<string>>(new Set());
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  function resetResults() {
    setValidated(null);
    setRejected([]);
    setSuggestedTopics([]);
    setSelectedFeeds(new Set());
    setSelectedTopics(new Set());
    setDiscoverError(null);
    setCommitError(null);
  }

  async function onSubmitFeeds(e: FormEvent) {
    e.preventDefault();
    resetResults();
    setDiscovering(true);
    try {
      const lines = feedLinesText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length === 0) {
        throw new Error("paste at least one feed (one per line)");
      }
      const result = await onboard({ feedLines: lines });
      setValidated(result.feedsValidated);
      setRejected(result.feedsRejected);
      setSuggestedTopics(result.suggestedTopics);
      setSelectedFeeds(new Set(result.feedsValidated.map((f) => f.handle)));
      setSelectedTopics(new Set(result.suggestedTopics));
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : "discover failed");
    } finally {
      setDiscovering(false);
    }
  }

  async function onSubmitTopics() {
    resetResults();
    if (pickedTopics.size === 0) {
      setDiscoverError("pick at least one topic");
      return;
    }
    setDiscovering(true);
    try {
      const topics = Array.from(pickedTopics);
      const result = await suggestFromTopics({ topics });
      if (result.feedsSuggested.length === 0) {
        throw new Error(
          "no catalog feeds match those topics. try a different combo or paste your own feeds.",
        );
      }
      setValidated(result.feedsSuggested);
      setRejected([]);
      setSuggestedTopics(topics); // user-picked topics ARE the suggestions
      setSelectedFeeds(new Set(result.feedsSuggested.map((f) => f.handle)));
      setSelectedTopics(new Set(topics));
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : "discover failed");
    } finally {
      setDiscovering(false);
    }
  }

  async function onCommit() {
    if (!validated) return;
    setCommitError(null);
    setCommitting(true);
    try {
      for (const f of validated.filter((s) => selectedFeeds.has(s.handle))) {
        await addFeed({ kind: f.kind, handle: f.handle, title: f.title });
      }
      for (const t of suggestedTopics.filter((s) => selectedTopics.has(s))) {
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

  function toggleSuggestedTopic(topic: string) {
    setSelectedTopics((s) => {
      const next = new Set(s);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  }

  function togglePickedTopic(topic: string) {
    setPickedTopics((s) => {
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
        Paste the newsletters you actually read, OR pick the topics you care
        about and we&apos;ll suggest popular newsletters in those areas. The
        curator agent validates each feed and clusters topics from your
        actual reads.
      </p>

      {(existingFeeds?.length ?? 0) > 0 && (
        <p className="mt-4 text-sm text-[#F2F0E4]/55">
          You already have {existingFeeds?.length} feed
          {existingFeeds?.length === 1 ? "" : "s"} and {existingTopics?.length} topic
          {existingTopics?.length === 1 ? "" : "s"}. Run again to add more.
        </p>
      )}

      {/* mode toggle */}
      <div className="mt-10 flex gap-1 border border-[#D4AF37]/30 w-fit">
        <button
          type="button"
          onClick={() => {
            setMode("feeds");
            resetResults();
          }}
          className={`px-5 py-3 font-display uppercase tracking-[0.3em] text-[10px] transition-colors ${
            mode === "feeds"
              ? "bg-[#D4AF37] text-[#0A0A0A]"
              : "text-[#F2F0E4]/70 hover:text-[#D4AF37]"
          }`}
        >
          I HAVE FEEDS
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("topics");
            resetResults();
          }}
          className={`px-5 py-3 font-display uppercase tracking-[0.3em] text-[10px] transition-colors ${
            mode === "topics"
              ? "bg-[#D4AF37] text-[#0A0A0A]"
              : "text-[#F2F0E4]/70 hover:text-[#D4AF37]"
          }`}
        >
          SHOW ME POPULAR
        </button>
      </div>

      {mode === "feeds" && (
        <form onSubmit={onSubmitFeeds} className="mt-8 space-y-3">
          <label className="block font-display uppercase tracking-[0.3em] text-[10px] text-[#D4AF37]/80">
            ONE FEED PER LINE
          </label>
          <textarea
            value={feedLinesText}
            onChange={(e) => setFeedLinesText(e.target.value)}
            placeholder={`noahpinion\n@astralcodexten\nhttps://www.slowboring.com\nhttps://example.com/feed.xml`}
            rows={6}
            className="w-full bg-[#141414] border border-[#D4AF37]/30 text-[#F2F0E4] px-3 py-3 focus:border-[#D4AF37] focus:outline-none font-mono text-sm"
          />
          <p className="text-xs text-[#F2F0E4]/55">
            substack handle (<span className="font-mono">noahpinion</span>),{" "}
            <span className="font-mono">@handle</span>, full publication URL,
            or any RSS URL all work.
          </p>
          <button
            type="submit"
            disabled={discovering}
            className="bg-[#D4AF37] text-[#0A0A0A] font-display uppercase tracking-[0.3em] text-xs px-6 py-3 hover:bg-[#F2F0E4] transition-colors disabled:opacity-50"
          >
            {discovering ? "VALIDATING…" : "VALIDATE FEEDS"}
          </button>
        </form>
      )}

      {mode === "topics" && (
        <div className="mt-8 space-y-4">
          <p className="font-display uppercase tracking-[0.3em] text-[10px] text-[#D4AF37]/80">
            PICK ANY THAT INTEREST YOU
          </p>
          <div className="flex flex-wrap gap-2">
            {STARTER_TOPICS.map((t) => {
              const on = pickedTopics.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => togglePickedTopic(t)}
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
          <button
            type="button"
            onClick={onSubmitTopics}
            disabled={discovering || pickedTopics.size === 0}
            className="bg-[#D4AF37] text-[#0A0A0A] font-display uppercase tracking-[0.3em] text-xs px-6 py-3 hover:bg-[#F2F0E4] transition-colors disabled:opacity-50"
          >
            {discovering ? "FETCHING SUGGESTIONS…" : "SUGGEST FEEDS"}
          </button>
        </div>
      )}

      {discoverError && (
        <p className="mt-4 text-sm text-red-400 border border-red-500/30 bg-red-500/5 px-3 py-2">
          {discoverError}
        </p>
      )}

      {validated && (
        <div className="mt-12 space-y-12">
          {rejected.length > 0 && (
            <div>
              <p className="font-display uppercase tracking-[0.3em] text-xs text-red-400 mb-3">
                {rejected.length} LINE{rejected.length === 1 ? "" : "S"} REJECTED
              </p>
              <ul className="space-y-1.5">
                {rejected.map((r, i) => (
                  <li
                    key={`${r.line}-${i}`}
                    className="text-sm border border-red-500/20 bg-red-500/5 px-3 py-2"
                  >
                    <span className="font-mono text-red-400">{r.line}</span>
                    <span className="text-[#F2F0E4]/65"> — {r.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="font-display uppercase tracking-[0.3em] text-xs text-[#D4AF37]">
                FEEDS — {validated.length} VALID
              </p>
              <p className="font-display uppercase tracking-[0.3em] text-[10px] text-[#F2F0E4]/55">
                {selectedFeeds.size} SELECTED
              </p>
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              {validated.map((f) => {
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
                        {f.handle} · {f.kind}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {suggestedTopics.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="font-display uppercase tracking-[0.3em] text-xs text-[#D4AF37]">
                  TOPICS — {mode === "feeds" ? "CLUSTERED" : "PICKED"}
                </p>
                <p className="font-display uppercase tracking-[0.3em] text-[10px] text-[#F2F0E4]/55">
                  {selectedTopics.size} SELECTED
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedTopics.map((t) => {
                  const on = selectedTopics.has(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleSuggestedTopic(t)}
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
          )}

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
