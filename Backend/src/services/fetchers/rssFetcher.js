const Parser = require("rss-parser");
const RSS_Sources = require("../sources/rssSources");
const { isTechArticle } = require("../utils/techFilter");

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "NewsAggregator/1.0",
  },
});

async function fetchOne(source) {
  try {
    console.log(`[RSS] Fetching : ${source.name}`);

    const feed = await parser.parseURL(source.url);

    const articles = feed.items
      .filter(
        (item) => item.title && (item.link || item.guid) && isTechArticle(item),
      )
      .map((item) => ({
        title: item.title?.trim() || null,
        description:
          item.contentSnippet?.trim() || item.summary?.trim() || null,
        url: item.link || item.guid || null,
        publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
        source: source.name,
        category: source.category || "technology",
        fetchedFrom: "rss",
      }));

    console.log(`[RSS] ${source.name} -> tech-filtered ${articles.length}`);
    return articles;
  } catch (err) {
    console.error(`failed to fetch [RSS] ${source.name}: ${err.message}`);
    return [];
  }
}

async function fetchAll() {
  const results = await Promise.allSettled(
    RSS_Sources.map((source) => fetchOne(source)),
  );

  const allArticles = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);

  console.log(`[RSS] total article : ${allArticles.length}`);
  return allArticles;
}

module.exports = { fetchAll };
