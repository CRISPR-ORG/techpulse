const {
  storiesService,
  articlesService,
  storyClicksService,
} = require("../models");
const { getJSON, setJSON } = require("../services/cache/cacheService");
const { cacheKeys, CACHE_TTL } = require("../services/cache/cacheKeys");

const CAMPUS_PULSE_CATEGORY = "campus-pulse";

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeCategory(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

async function getStories(req, res) {
  try {
    const limit = toPositiveInt(req.query.limit, 20);
    const offset = toNonNegativeInt(req.query.offset, 0);
    const key = cacheKeys.stories({ category: "all", limit, offset });

    const cached = await getJSON(key);
    if (cached !== null) {
      return res.json(cached);
    }

    const stories = await storiesService.getStories(null, limit, offset);
    await setJSON(key, stories, CACHE_TTL.STORIES);
    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

async function getTrendingStories(req, res) {
  try {
    const days = toPositiveInt(req.query.days, 7);
    const limit = toPositiveInt(req.query.limit, 10);
    const key = cacheKeys.trending({ days, limit });

    const cached = await getJSON(key);
    if (cached !== null) {
      return res.json(cached);
    }

    const stories = await storiesService.getTrendingStories(days, limit);
    await setJSON(key, stories, CACHE_TTL.TRENDING);
    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

async function getStoriesByCategory(req, res) {
  try {
    const category = normalizeCategory(req.params.category);
    const limit = toPositiveInt(req.query.limit, 20);
    const offset = toNonNegativeInt(req.query.offset, 0);
    const key = cacheKeys.stories({ category, limit, offset });

    const cached = await getJSON(key);
    if (cached !== null) {
      return res.json(cached);
    }

    const stories = await storiesService.getStories(category, limit, offset);
    await setJSON(key, stories, CACHE_TTL.STORIES);
    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

async function getCampusPulseStories(req, res) {
  try {
    const limit = toPositiveInt(req.query.limit, 20);
    const offset = toNonNegativeInt(req.query.offset, 0);
    const key = cacheKeys.stories({
      category: CAMPUS_PULSE_CATEGORY,
      limit,
      offset,
    });

    const cached = await getJSON(key);
    if (cached !== null) {
      return res.json(cached);
    }

    const stories = await storiesService.getStories(
      CAMPUS_PULSE_CATEGORY,
      limit,
      offset,
    );
    await setJSON(key, stories, CACHE_TTL.STORIES);
    return res.json(stories);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

async function getStoryArticles(req, res) {
  try {
    const storyId = req.params.id;
    const limit = toPositiveInt(req.query.limit, 50);
    const offset = toNonNegativeInt(req.query.offset, 0);
    const key = cacheKeys.storyArticles({ storyId, limit, offset });

    const cached = await getJSON(key);
    if (cached !== null) {
      return res.json(cached);
    }

    const articles = await articlesService.getArticlesByStoryId(
      storyId,
      limit,
      offset,
    );
    await setJSON(key, articles, CACHE_TTL.STORY_ARTICLES);
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

async function getStoryById(req, res) {
  try {
    const articles = await articlesService.getArticlesByStoryId(req.params.id);
    if (!articles.length)
      return res.status(404).json({ error: "Story not found" });
    // also record a click when someone opens a story
    await storyClicksService.recordClick(req.params.id);
    res.json({ story_id: req.params.id, articles });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  getStories,
  getTrendingStories,
  getStoriesByCategory,
  getCampusPulseStories,
  getStoryArticles,
  getStoryById,
};
