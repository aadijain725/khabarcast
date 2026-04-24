import Parser from "rss-parser";

const feeds = [
  "https://astralcodexten.substack.com/feed",
  "https://noahpinion.substack.com/feed",
  "https://bariweiss.substack.com/feed",
  "https://mattstoller.substack.com/feed",
  "https://www.slowboring.com/feed",
];

const parser: Parser = new Parser();

async function main() {
for (const url of feeds) {
  try {
    const feed = await parser.parseURL(url);
    const item = feed.items[0];
    const html =
      (item as unknown as Record<string, string>)["content:encoded"] ||
      item.content ||
      "";
    const cleanText = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const words = cleanText.split(/\s+/).length;
    console.log({
      url,
      title: item.title,
      publishedAt: item.isoDate,
      words,
      pass: words >= 500,
      preview: cleanText.slice(0, 120),
    });
  } catch (e) {
    console.log({ url, error: String(e) });
  }
}
}

main();
