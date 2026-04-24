/**
 * poc 5 — end-to-end partial smoke (poc 2 → poc 1).
 *
 * Skipped for now: poc 3 (topic selector — optional fork) and poc 4 (TTS —
 * not built yet). This chain proves the fetch → dialogue half works; audio
 * rendering is the remaining gap.
 *
 * Usage:
 *   npx tsx poc/05-e2e-smoke.ts <feed-url>
 *
 * Env:
 *   CONVEX_DEPLOYMENT must be set (via .env.local). Script shells out to
 *   `npx convex run` — no ConvexHttpClient admin-key juggling.
 */

import Parser from "rss-parser";
import { execSync } from "node:child_process";

const USER_TOKEN = "poc5-smoke";

function runConvex(fn: string, args: Record<string, unknown>): unknown {
  // Pass args via env-backed temp file to avoid shell-quoting nightmares on
  // articles with apostrophes, quotes, or newlines.
  const argsJson = JSON.stringify(args);
  const out = execSync(`npx convex run ${fn} ${quote(argsJson)}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  const trimmed = out.trim();
  return trimmed ? JSON.parse(trimmed) : null;
}

function quote(s: string): string {
  // single-quote wrap, escape inner single quotes for POSIX shells
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("usage: npx tsx poc/05-e2e-smoke.ts <feed-url>");
    process.exit(1);
  }

  const stageTimes: Record<string, number> = {};

  // ── poc 2: fetch RSS ──────────────────────────────────────────────
  let t = Date.now();
  const parser: Parser = new Parser();
  const feed = await parser.parseURL(url);
  const item = feed.items[0];
  if (!item) throw new Error("feed has no items");
  const html =
    ((item as unknown as Record<string, string>)["content:encoded"] ||
      item.content ||
      "") as string;
  const cleanText = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = cleanText.split(/\s+/).length;
  stageTimes.fetchMs = Date.now() - t;

  if (wordCount < 300) {
    throw new Error(`article too thin: ${wordCount} words (min 300)`);
  }

  console.log(
    `[fetch] "${item.title}" — ${wordCount} words — ${stageTimes.fetchMs}ms`,
  );

  // ── convex: create source ─────────────────────────────────────────
  t = Date.now();
  const sourceId = runConvex("sources:createInternal", {
    userTokenId: USER_TOKEN,
    title: item.title ?? "untitled",
    rawText: cleanText,
    url: item.link,
  }) as string;
  stageTimes.createSourceMs = Date.now() - t;
  console.log(`[source] ${sourceId} — ${stageTimes.createSourceMs}ms`);

  // ── poc 1: generate dialogue ──────────────────────────────────────
  t = Date.now();
  const { runId, episodeId } = runConvex(
    "pipeline/generateScript:runInternal",
    { sourceId, userTokenId: USER_TOKEN },
  ) as { runId: string; episodeId: string };
  stageTimes.generateMs = Date.now() - t;
  console.log(
    `[generate] run=${runId} episode=${episodeId} — ${stageTimes.generateMs}ms`,
  );

  // ── fetch episode, summarize ──────────────────────────────────────
  t = Date.now();
  const episode = runConvex("episodes:getInternal", { episodeId }) as {
    dialogue: {
      episode_title: string;
      topics: Array<{ subtopics: Array<{ turns: Array<unknown> }> }>;
    };
    promptVersion: string;
  };
  stageTimes.fetchEpisodeMs = Date.now() - t;

  const turnCount = episode.dialogue.topics.reduce(
    (sum, topic) =>
      sum +
      topic.subtopics.reduce((s, sub) => s + sub.turns.length, 0),
    0,
  );

  const totalMs = Object.values(stageTimes).reduce((a, b) => a + b, 0);

  console.log("");
  console.log("═══ SUMMARY ═══");
  console.log(`episode:        ${episode.dialogue.episode_title}`);
  console.log(`prompt version: ${episode.promptVersion}`);
  console.log(`topics:         ${episode.dialogue.topics.length}`);
  console.log(`turns:          ${turnCount}`);
  console.log(`word count in:  ${wordCount}`);
  console.log(`stage timings:`);
  for (const [k, v] of Object.entries(stageTimes)) {
    console.log(`  ${k.padEnd(18)} ${v}ms`);
  }
  console.log(`total wall:     ${totalMs}ms`);
  console.log("");
  console.log("dialogue json:");
  console.log(JSON.stringify(episode.dialogue, null, 2));
}

main().catch((e) => {
  console.error("[error]", e instanceof Error ? e.message : e);
  process.exit(1);
});
