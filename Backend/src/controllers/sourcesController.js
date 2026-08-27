const { sourcesService, articlesService } = require("../models");
const { getJSON, setJSON } = require("../services/cache/cacheService");
const { cacheKeys, CACHE_TTL } = require("../services/cache/cacheKeys");

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

async function getSources(req, res) {
  try {
    const key = cacheKeys.sources();
    const cached = await getJSON(key);
    if (cached !== null) {
      return res.json(cached);
    }

    const sources = await sourcesService.getAllSources();
    await setJSON(key, sources, CACHE_TTL.SOURCES);

    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

async function getSourceStories(req, res) {
  try {
    const sourceName = req.params.name;
    const limit = toPositiveInt(req.query.limit, 50);
    const offset = toNonNegativeInt(req.query.offset, 0);
    const key = cacheKeys.sourceStories({ sourceName, limit, offset });

    const cached = await getJSON(key);
    if (cached !== null) {
      return res.json(cached);
    }

    const articles = await articlesService.getArticlesBySource(
      sourceName,
      limit,
      offset,
    );
    await setJSON(key, articles, CACHE_TTL.SOURCE_STORIES);
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  getSources,
  getSourceStories,
};
