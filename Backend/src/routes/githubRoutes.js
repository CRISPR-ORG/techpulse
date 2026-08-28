const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { getJSON, setJSON } = require("../services/cache/cacheService");
const { cacheKeys, CACHE_TTL } = require("../services/cache/cacheKeys");
const { fetchOpenSourceData } = require("../services/fetchers/githubFetcher");

const router = express.Router();

// GitHub's search API allows only 10 requests/hour unauthenticated, and one
// refresh spends seven of them. The snapshot is mirrored to disk so a cold
// Redis (restart, flush) does not force another round of live searches.
const DAILY_CACHE_FILE = path.join(
  __dirname,
  "../../.cache/github-opensource-daily.json",
);

let refreshPromise = null;

function hasData(payload) {
  return Boolean(payload) && Array.isArray(payload.items);
}

function isFresh(timestamp) {
  if (!timestamp) return false;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed < CACHE_TTL.GITHUB_DAILY * 1000;
}

async function readFileCache() {
  try {
    const raw = await fs.readFile(DAILY_CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return { fetchedAt: parsed?.fetchedAt || null, data: parsed?.data || null };
  } catch {
    return { fetchedAt: null, data: null };
  }
}

async function writeFileCache(data) {
  try {
    await fs.mkdir(path.dirname(DAILY_CACHE_FILE), { recursive: true });
    await fs.writeFile(
      DAILY_CACHE_FILE,
      JSON.stringify({ fetchedAt: new Date().toISOString(), data }, null, 2),
      "utf8",
    );
  } catch (err) {
    console.error("[GitHub] file-cache write failed:", err.message || err);
  }
}

async function refreshOpenSourceCache({ force = false } = {}) {
  const key = cacheKeys.githubOpportunitiesDaily();
  let fallback = null;

  const cached = await getJSON(key);
  if (hasData(cached)) {
    if (!force) return cached;
    fallback = cached;
  } else {
    const file = await readFileCache();
    if (hasData(file.data)) {
      fallback = file.data;

      if (!force && isFresh(file.fetchedAt)) {
        await setJSON(key, file.data, CACHE_TTL.GITHUB_DAILY);
        return file.data;
      }
    }
  }

  // Collapse concurrent misses into one upstream refresh.
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    let live = null;

    try {
      live = await fetchOpenSourceData();
    } catch (err) {
      console.error("[GitHub] refresh failed:", err.message || err);
      live = null;
    }

    if (!hasData(live) || live.items.length === 0) {
      // Rate limited or upstream down: keep serving the last good snapshot
      // rather than emptying the page.
      return hasData(fallback) ? fallback : null;
    }

    await setJSON(key, live, CACHE_TTL.GITHUB_DAILY);
    await writeFileCache(live);
    return live;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

router.get("/", async (req, res) => {
  try {
    const payload = await refreshOpenSourceCache({ force: false });

    if (!hasData(payload)) {
      return res.status(503).json({
        error:
          "GitHub data is unavailable right now (rate limited). Set GITHUB_TOKEN to raise the limit.",
        items: [],
        repos: [],
        total_count: 0,
      });
    }

    return res.json(payload);
  } catch (err) {
    console.error("[GitHub] request failed:", err.message || err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
module.exports.refreshOpenSourceCache = refreshOpenSourceCache;
