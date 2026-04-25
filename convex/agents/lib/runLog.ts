"use node";

// phase 4 (MAAS): trace primitive every agent uses. Wraps a unit of agent work,
// inserts a generationRuns row in pending state, runs the body, and patches OK
// or ERROR on completion with latency + cost + token + output preview. The
// /app/runs page reads from generationRuns to render the trace tree.

import { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

export type TraceMeta = {
  userTokenId: string;
  sourceId?: Id<"sources">;
  parentRunId?: Id<"generationRuns">;
  step: string; // "manager" | "curator" | "researcher" | "ideology" | "composer" | "voice"
  agentName: string; // e.g. "ideology-kalam"
  model: string;
  promptVersion: string;
  input: unknown;
};

export type TraceResult = {
  output: unknown;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  episodeId?: Id<"episodes">;
};

const PREVIEW_LIMIT = 1500;

function preview(value: unknown): string {
  let s: string;
  try {
    s = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    s = String(value);
  }
  if (s == null) return "";
  return s.length > PREVIEW_LIMIT ? s.slice(0, PREVIEW_LIMIT) + "…(truncated)" : s;
}

export async function withTrace<T extends TraceResult>(
  ctx: ActionCtx,
  meta: TraceMeta,
  body: (runId: Id<"generationRuns">) => Promise<T>,
): Promise<{ runId: Id<"generationRuns">; output: T }> {
  const start = Date.now();
  const runId: Id<"generationRuns"> = await ctx.runMutation(
    internal.generationRuns.createTraceInternal,
    {
      userTokenId: meta.userTokenId,
      sourceId: meta.sourceId,
      parentRunId: meta.parentRunId,
      step: meta.step,
      agentName: meta.agentName,
      model: meta.model,
      promptVersion: meta.promptVersion,
      inputPreview: preview(meta.input),
    },
  );

  try {
    const result = await body(runId);
    await ctx.runMutation(internal.generationRuns.markOkTraceInternal, {
      runId,
      outputPreview: preview(result.output),
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costUsd: result.costUsd,
      latencyMs: Date.now() - start,
      episodeId: result.episodeId,
    });
    return { runId, output: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.runMutation(internal.generationRuns.markErrorTraceInternal, {
      runId,
      errorMessage: message,
      latencyMs: Date.now() - start,
    });
    throw err;
  }
}

// Approximate USD cost for claude-sonnet-4-6. Anthropic prices move; bump when
// they change. Sonnet 4.6 = $3 / Mtok in, $15 / Mtok out as of 2026-04.
export function estimateClaudeCost(model: string, inTok: number, outTok: number): number {
  if (model.includes("sonnet")) return (inTok * 3 + outTok * 15) / 1_000_000;
  if (model.includes("opus")) return (inTok * 15 + outTok * 75) / 1_000_000;
  if (model.includes("haiku")) return (inTok * 0.8 + outTok * 4) / 1_000_000;
  return 0;
}
