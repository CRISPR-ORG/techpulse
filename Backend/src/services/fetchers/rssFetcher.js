const Parser = require("rss-parser");
const RSS_Sources = require("../sources/rssSources");
const { isTechArticle } = require("../utils/techFilter");
const { cleanDescription, decodeEntities } = require("../utils/sanitizeText");

const DEFAULT_MAX_ITEMS = RSS_Sources.DEFAULT_MAX_ITEMS || 40;

// Several publishers reject the default rss-parser agent outright.
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// Enough parallelism to keep a ~60-feed run quick, low enough to stay polite
// and avoid opening 60 sockets at once.
const FETCH_CONCURRENCY = Number(process.env.RSS_CONCURRENCY || 12);

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": USER_AGENT,
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
  },
});

function pickImage(item) {
  return (
    item?.enclosure?.url ||
    item?.["media:content"]?.$?.url ||
    item?.["media:thumbnail"]?.$?.url ||
    null
  );
}

function pickDescription(item) {
  return (
    cleanDescription(item?.contentSnippet) ||
    cleanDescription(item?.summary) ||
    cleanDescription(item?.content) ||
    cleanDescription(item?.["content:encoded"]) ||
    null
  );
}

async function fetchOne(source) {
  const maxItems = source.maxItems || DEFAULT_MAX_ITEMS;

  try {
    const feed = await parser.parseURL(source.url);
    const items = Array.isArray(feed.items) ? feed.items : [];

    const articles = items
      .filter((item) => {
        if (!item?.title || !(item.link || item.guid)) return false;
        // Feeds that only ever publish tech skip keyword matching, which
        // otherwise drops valid stories that avoid the obvious vocabulary.
        return source.trusted ? true : isTechArticle(item);
      })
      .slice(0, maxItems)
      .map((item) => ({
        title: decodeEntities(item.title).trim() || null,
        description: pickDescription(item),
        url: item.link || item.guid || null,
        publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
        source: source.name,
        imageUrl: pickImage(item),
        category: source.category || "technology",
        fetchedFrom: "rss",
      }));

    console.log(
      `[RSS] ${source.name} -> ${articles.length}/${items.length} kept`,
    );
    return articles;
  } catch (err) {
    console.error(`[RSS] ${source.name} failed: ${err.message}`);
    return [];
  }
}

/** Run tasks with a bounded number in flight at any moment. */
async function mapWithConcurrency(items, limit, task) {
  const results = [];
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await task(items[index]);
      }
    })(),
  );

  await Promise.all(workers);
  return results;
}

async function fetchAll() {
  const startedAt = Date.now();

  const perSource = await mapWithConcurrency(
    RSS_Sources,
    FETCH_CONCURRENCY,
    fetchOne,
  );

  const allArticles = perSource.flat();
  const liveSources = perSource.filter((list) => list.length > 0).length;

  console.log(
    `[RSS] ${allArticles.length} articles from ${liveSources}/${RSS_Sources.length} feeds in ${Date.now() - startedAt}ms`,
  );

  return allArticles;
}

module.exports = { fetchAll, mapWithConcurrency };
