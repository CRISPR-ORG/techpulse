const {
  storiesService,
  articlesService,
  storyClicksService,
} = require("../models");
const { getJSON, setJSON } = require("../services/cache/cacheService");
const { cacheKeys, CACHE_TTL } = require("../services/cache/cacheKeys");
const { cleanDescription } = require("../services/utils/sanitizeText");

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

/**
 * Attach each story's most recent article as `lead_article`.
 *
 * Without this the browser has to issue one request per story to render a
 * card, which is a request per row on a feed meant to show every story.
 */
async function attachLeadArticles(stories) {
  const items = await Promise.all(
    stories.map(async (story) => {
      try {
        const articles = await articlesService.getArticlesByStoryId(
          story.id,
          1,
          0,
        );
        const lead = articles[0];
        if (!lead || !lead.url || lead.url === "#") {
          return null;
        }

        return {
          ...story,
          lead_article: {
            ...lead,
            description: cleanDescription(lead.description),
          },
        };
      } catch {
        return null;
      }
    }),
  );
  return items.filter(Boolean);
}

async function getStories(req, res) {
  try {
    const limit = toPositiveInt(req.query.limit, 20);
    const offset = toNonNegativeInt(req.query.offset, 0);
    const withLead = String(req.query.include || "") === "lead";
    const key = cacheKeys.stories({
      category: withLead ? "all-lead" : "all",
      limit,
      offset,
    });

    const cached = await getJSON(key);
    if (cached !== null) {
      return res.json(cached);
    }

    const stories = await storiesService.getStories(null, limit, offset);
    const payload = withLead ? await attachLeadArticles(stories) : stories;

    await setJSON(key, payload, CACHE_TTL.STORIES);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

/**
 * Total number of tech stories, so the feed can show a real count rather
 * than guessing the end of the list from a short page.
 */
async function getStoriesCount(req, res) {
  try {
    const total = await storiesService.countStories(null);
    res.json({ total });
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

    // Only publish entries that actually have an article attached, so a
    // half-written story never renders as an empty bulletin.
    const withArticles = (
      await Promise.all(
        stories.map(async (story) => {
          const articles = await articlesService.getArticlesByStoryId(
            story.id,
            1,
            0,
          );
          return articles.length > 0 ? story : null;
        }),
      )
    ).filter(Boolean);

    await setJSON(key, withArticles, CACHE_TTL.STORIES);
    return res.json(withArticles);
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
  getStoriesCount,
  getTrendingStories,
  getStoriesByCategory,
  getCampusPulseStories,
  getStoryArticles,
  getStoryById,
};
