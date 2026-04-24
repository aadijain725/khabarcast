import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import Parser from "rss-parser";
import Anthropic from "@anthropic-ai/sdk";

const FEEDS = [
  "https://astralcodexten.substack.com/feed",
  "https://noahpinion.substack.com/feed",
  "https://www.slowboring.com/feed",
];

const MODEL = "claude-sonnet-4-6";
const PROMPT_VERSION = "v0.1-2026-04-25";
const OUT_DIR = "poc/topics_out";

const PROMPT_TEMPLATE = readFileSync(
  "poc/03-topic-selector-prompt.md",
  "utf8",
)
  .split("## prompt (verbatim)")[1]
  .split("```")[1]
  .trim();

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFirstLong(url: string, minWords = 500) {
  const parser: Parser = new Parser();
  const feed = await parser.parseURL(url);
  for (const item of feed.items.slice(0, 5)) {
    const html =
      (item as unknown as Record<string, string>)["content:encoded"] ||
      item.content ||
      "";
    const text = stripHtml(html);
    const words = text.split(/\s+/).length;
    if (words >= minWords) {
      return {
        title: item.title ?? "(untitled)",
        publishedAt: item.isoDate ?? null,
        text,
        words,
      };
    }
  }
  throw new Error(`no item >= ${minWords} words in first 5 of ${url}`);
}

function stripJsonFences(s: string): string {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (m ? m[1] : s).trim();
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set (check .env.local)");
  }
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  for (const feedUrl of FEEDS) {
    const slug = new URL(feedUrl).hostname.replace(/^www\./, "").split(".")[0];
    console.log(`\n=== ${slug} ===`);

    let article: Awaited<ReturnType<typeof fetchFirstLong>>;
    try {
      article = await fetchFirstLong(feedUrl);
    } catch (e) {
      console.log(`SKIP ${slug}: ${String(e)}`);
      continue;
    }
    console.log(`title: ${article.title}`);
    console.log(`words: ${article.words}`);

    const filled = PROMPT_TEMPLATE.replace(
      "<<<PASTE FULL ARTICLE TEXT HERE>>>",
      article.text,
    );

    const t0 = Date.now();
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: filled }],
    });
    const ms = Date.now() - t0;

    const textBlock = resp.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.log("SKIP: no text block in response");
      continue;
    }

    const raw = textBlock.text;
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFences(raw));
    } catch (e) {
      console.log(`PARSE FAIL: ${String(e)}`);
      writeFileSync(
        join(OUT_DIR, `${slug}.raw.txt`),
        raw,
      );
      continue;
    }

    const out = {
      feed: feedUrl,
      article_title: article.title,
      article_words: article.words,
      published_at: article.publishedAt,
      model: MODEL,
      prompt_version: PROMPT_VERSION,
      latency_ms: ms,
      usage: resp.usage,
      topics: parsed,
    };
    const outPath = join(OUT_DIR, `${slug}.json`);
    writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(`saved: ${outPath}  (${ms}ms, in=${resp.usage.input_tokens} out=${resp.usage.output_tokens})`);

    const topics = (parsed as { topics?: { title: string; tension: string }[] }).topics ?? [];
    for (const t of topics) {
      console.log(`  • ${t.title}  —  tension: ${t.tension}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
