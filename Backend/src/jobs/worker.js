const { fetchAll } = require("../services/fetchers/rssFetcher");
const { fetchNews } = require("../services/fetchers/newsFetcher");
const { deduplicate } = require("../services/utils/removeDuplicates");
const { sourcesService } = require("../models");
const {
  ingestArticles,
  sweepOrphanStories,
} = require("../models/bulkIngestService");
const { deleteByPattern } = require("../services/cache/cacheService");

function normalizeArticle(article) {
  return {
    title: article.title?.trim() || null,
    description: article.description?.trim() || null,
    url: article.url?.trim() || null,
    source_name: article.source?.trim() || article.source_name?.trim() || null,
    image_url: article.imageUrl || article.image_url || null,
    published_at:
      article.publishedAt || article.published_at || new Date().toISOString(),
    category:
      typeof article.category === "string" && article.category.trim()
        ? article.category.trim().toLowerCase()
        : "technology",
  };
}

async function runWorker() {
  console.log(`[Worker] Started at ${new Date().toISOString()}`);

  try {
    console.log(`[Worker] Step 1: Fetching articles...`);

    const [rssArticles, newsArticles] = await Promise.all([
      fetchAll(),
      fetchNews(),
    ]);

    console.log(`[Worker] RSS articles: ${rssArticles.length}`);
    console.log(`[Worker] NewsAPI articles: ${newsArticles.length}`);
    const rawArticles = [...rssArticles, ...newsArticles];
    console.log(`[Worker] Total combined: ${rawArticles.length} articles`);

    console.log(`[Worker] Step 2: Deduplicating`);
    const uniqueArticles = deduplicate(rawArticles);
    console.log(`[Worker] Unique articles: ${uniqueArticles.length}`);

    console.log(`[Worker] Step 3: Persisting`);

    const normalized = uniqueArticles
      .map(normalizeArticle)
      // No tech filter here: each fetcher already applies its own rule
      // (keyword matching for general feeds, trusted for tech-only
      // publications). Re-filtering would discard stories those rules kept.
      .filter((article) => article.title && article.url && article.source_name);

    const sourceNames = [...new Set(normalized.map((a) => a.source_name))];
    await Promise.all(
      sourceNames.map((name) => sourcesService.getOrCreateSource(name)),
    );

    const result = await ingestArticles(normalized);
    const insertedArticles = result.inserted;

    console.log(
      `[Worker] Persisted ${insertedArticles} new articles (${result.candidates} candidates, ${result.skipped} already known${result.orphansRemoved ? `, ${result.orphansRemoved} empty stories cleaned` : ""}) via ${result.backend}`,
    );

    // Self-healing: clears anything an interrupted or older run left behind.
    const sweptOrphans = await sweepOrphanStories();
    if (sweptOrphans > 0) {
      console.log(`[Worker] Swept ${sweptOrphans} stories with no article`);
    }

    if (insertedArticles > 0 || sweptOrphans > 0) {
      const deletedCounts = await Promise.all([
        deleteByPattern("stories:*"),
        deleteByPattern("trending:*"),
        deleteByPattern("story_articles:*"),
        deleteByPattern("sources:*"),
        deleteByPattern("source_stories:*"),
        deleteByPattern("search:*"),
        deleteByPattern("article:*"),
      ]);

      const totalDeleted = deletedCounts.reduce((acc, count) => acc + count, 0);
      console.log(`[Worker] Cache invalidated keys: ${totalDeleted}`);
    }

    console.log(`[Worker] Finished`);
  } catch (err) {
    console.error("[Worker] Not successful:", err.message);
  }
}

module.exports = runWorker;
