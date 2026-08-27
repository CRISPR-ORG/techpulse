const { fetchAll } = require("../services/fetchers/rssFetcher");
const { fetchNews } = require("../services/fetchers/newsFetcher");
const { deduplicate } = require("../services/utils/removeDuplicates");
const { isTechArticle } = require("../services/utils/techFilter");
const {
  storiesService,
  articlesService,
  sourcesService,
} = require("../models");
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

    console.log(`[Worker] Step 3: Filtering & Persisting`);

    let insertedArticles = 0;
    const touchedStoryIds = new Set();

    for (const rawArticle of uniqueArticles) {
      const article = normalizeArticle(rawArticle);

      if (!article.title || !article.url || !article.source_name) {
        continue;
      }

      if (!isTechArticle(article)) {
        continue;
      }

      await sourcesService.getOrCreateSource(article.source_name);

      const storyId = await storiesService.getOrCreateStory(
        article.title,
        article.category,
        article.image_url,
      );

      if (!storyId) {
        continue;
      }

      const articleId = await articlesService.insertArticle(article, storyId);

      if (!articleId) {
        continue;
      }

      insertedArticles += 1;
      touchedStoryIds.add(storyId);
    }

    let refreshedStories = 0;
    for (const storyId of touchedStoryIds) {
      const ok = await storiesService.updateStorySourcesCount(storyId);
      if (ok) {
        refreshedStories += 1;
      }
    }

    console.log(
      `[Worker] Persisted ${insertedArticles} articles across ${refreshedStories} stories`,
    );

    if (insertedArticles > 0) {
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
