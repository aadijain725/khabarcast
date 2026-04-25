"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

function formatWhen(ts: number): string {
  const d = new Date(ts);
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  return `${month} ${d.getDate()} · ${d
    .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function formatLatency(ms: number | undefined): string {
  if (ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(usd: number | undefined): string {
  if (usd === undefined || usd === 0) return "—";
  if (usd < 0.001) return `<$0.001`;
  return `$${usd.toFixed(4)}`;
}

function formatTokens(inTok: number | undefined, outTok: number | undefined): string {
  if (inTok === undefined && outTok === undefined) return "—";
  return `${inTok ?? 0} → ${outTok ?? 0}`;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "ok"
      ? "border-[#D4AF37]/60 text-[#D4AF37]"
      : status === "error"
        ? "border-red-500/60 text-red-400"
        : "border-[#F2F0E4]/40 text-[#F2F0E4]/60";
  return (
    <span
      className={`inline-block border px-2 py-0.5 font-display uppercase tracking-[0.3em] text-[9px] ${cls}`}
    >
      {status}
    </span>
  );
}

function ChildList({ parentRunId }: { parentRunId: Id<"generationRuns"> }) {
  const children = useQuery(api.generationRuns.listChildren, { parentRunId });
  if (children === undefined) {
    return (
      <p className="ml-6 mt-3 font-display uppercase tracking-[0.3em] text-[10px] text-[#F2F0E4]/40">
        loading children…
      </p>
    );
  }
  if (children.length === 0) {
    return (
      <p className="ml-6 mt-3 font-display uppercase tracking-[0.3em] text-[10px] text-[#F2F0E4]/40">
        no child runs
      </p>
    );
  }
  return (
    <ul className="ml-6 mt-3 border-l border-[#D4AF37]/30 pl-4 space-y-3">
      {children.map((c) => (
        <RunRow key={c._id} run={c} depth={1} />
      ))}
    </ul>
  );
}

function RunRow({ run, depth }: { run: Doc<"generationRuns">; depth: number }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex flex-col md:flex-row md:items-baseline md:gap-4 hover:bg-[#141414]/40 transition-colors px-2 py-2 -ml-2 -mr-2 rounded-sm"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={run.status} />
            <span className="font-display uppercase tracking-[0.3em] text-[11px] text-[#D4AF37]">
              {run.step ?? "legacy"}
            </span>
            <span className="font-display tracking-[0.05em] text-[#F2F0E4]/85 truncate">
              {run.agentName ?? "—"}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-4 flex-wrap font-display tracking-[0.05em] text-[11px] text-[#F2F0E4]/55">
            <span>{run.model}</span>
            <span>· {formatLatency(run.latencyMs)}</span>
            <span>· {formatCost(run.costUsd)}</span>
            <span>· tokens {formatTokens(run.tokensIn, run.tokensOut)}</span>
            {depth === 0 && (
              <span className="text-[#F2F0E4]/45">· {formatWhen(run.startedAt)}</span>
            )}
          </div>
        </div>
        <span
          aria-hidden="true"
          className={`shrink-0 text-[#D4AF37] transition-transform ${open ? "rotate-90" : ""}`}
        >
          →
        </span>
      </button>

      {open && (
        <div className="mt-3 ml-2 space-y-3">
          {run.errorMessage && (
            <div className="border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300/90">
              <p className="font-display uppercase tracking-[0.3em] text-[9px] text-red-400/80 mb-2">
                error
              </p>
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px]">
                {run.errorMessage}
              </pre>
            </div>
          )}
          {run.inputPreview && (
            <details className="border border-[#D4AF37]/20 bg-[#141414] p-3">
              <summary className="cursor-pointer font-display uppercase tracking-[0.3em] text-[9px] text-[#D4AF37]/80">
                input ▾
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] text-[#F2F0E4]/80">
                {run.inputPreview}
              </pre>
            </details>
          )}
          {run.outputPreview && (
            <details className="border border-[#D4AF37]/20 bg-[#141414] p-3">
              <summary className="cursor-pointer font-display uppercase tracking-[0.3em] text-[9px] text-[#D4AF37]/80">
                output ▾
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] text-[#F2F0E4]/80">
                {run.outputPreview}
              </pre>
            </details>
          )}
          <ChildList parentRunId={run._id} />
        </div>
      )}
    </li>
  );
}

export default function RunsPage() {
  const roots = useQuery(api.generationRuns.listRoots, { limit: 50 });

  return (
    <section className="px-4 md:px-8 py-16 md:py-24 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="deco-rule" />
        <p className="font-display uppercase tracking-[0.4em] text-[10px] md:text-xs text-[#D4AF37]">
          RUNS · TRACE TREE
        </p>
      </div>

      <h1 className="mt-8 font-display uppercase tracking-[0.08em] leading-[0.95] text-[clamp(2rem,6vw,5rem)] text-[#F2F0E4]">
        WHAT YOUR
        <br />
        <span className="text-[#D4AF37]">AGENTS DID.</span>
      </h1>

      <p className="mt-4 max-w-2xl text-base md:text-lg text-[#F2F0E4]/70">
        Every agent step is recorded — model, latency, cost, tokens, input and
        output preview. Click a row to expand its children.
      </p>

      <div className="mt-12 md:mt-16">
        {roots === undefined && (
          <p className="font-display uppercase tracking-[0.3em] text-xs text-[#F2F0E4]/60">
            LOADING…
          </p>
        )}

        {roots && roots.length === 0 && (
          <div className="border border-[#D4AF37]/30 bg-[#141414] p-8 md:p-10">
            <p className="font-display uppercase tracking-[0.3em] text-[10px] md:text-xs text-[#D4AF37]">
              NO RUNS YET
            </p>
            <p className="mt-4 text-base md:text-lg text-[#F2F0E4]/75">
              Generate an episode from the main screen — the trace tree will
              show up here.
            </p>
          </div>
        )}

        {roots && roots.length > 0 && (
          <ul className="border-t border-b border-[#D4AF37]/20 divide-y divide-[#D4AF37]/15">
            {roots.map((r) => (
              <li key={r._id} className="py-5 md:py-6">
                <RunRow run={r} depth={0} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
