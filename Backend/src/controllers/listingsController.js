const { getJSON, setJSON } = require("../services/cache/cacheService");
const { cacheKeys, CACHE_TTL } = require("../services/cache/cacheKeys");
const fs = require("fs/promises");
const path = require("path");
const { hackathons } = require("../data/listingsData");
const { fetchTechJobs } = require("../services/fetchers/jobsFetcher");
const { canUseDiskCache } = require("../config/runtime");

const OPPORTUNITIES_FETCH_LIMIT = Number(
  process.env.OPPORTUNITIES_FETCH_LIMIT || 150,
);

// Opportunities refresh once a day, so the snapshot is also written to disk:
// Redis may be cold on boot, and the boards should not be hit on every request.
const DAILY_CACHE_FILE = path.join(
  __dirname,
  "../../.cache/opportunities-daily.json",
);

let opportunitiesRefreshPromise = null;

function isFreshDailyCache(timestamp) {
  if (!timestamp) return false;
  const fetchedMs = Date.parse(timestamp);
  if (Number.isNaN(fetchedMs)) return false;
  return Date.now() - fetchedMs < CACHE_TTL.LISTINGS_DAILY * 1000;
}

async function readDailyFileCache() {
  if (!canUseDiskCache()) return { fetchedAt: null, data: [] };

  try {
    const raw = await fs.readFile(DAILY_CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      fetchedAt: parsed?.fetchedAt || null,
      data: Array.isArray(parsed?.data) ? parsed.data : [],
    };
  } catch {
    return { fetchedAt: null, data: [] };
  }
}

function hasUsableOpportunities(payload) {
  return Array.isArray(payload) && payload.length > 0;
}

async function writeDailyFileCache(data) {
  if (!canUseDiskCache()) return;

  try {
    await fs.mkdir(path.dirname(DAILY_CACHE_FILE), { recursive: true });
    await fs.writeFile(
      DAILY_CACHE_FILE,
      JSON.stringify({ fetchedAt: new Date().toISOString(), data }, null, 2),
      "utf8",
    );
  } catch (err) {
    console.error("[Listings] file-cache write error:", err.message || err);
  }
}

/**
 * Refresh the daily opportunities snapshot.
 *
 * Concurrent callers share a single in-flight fetch, and a failed refresh
 * falls back to the last good snapshot so the page never empties out.
 */
async function refreshOpportunitiesCache({ force = false } = {}) {
  const key = cacheKeys.opportunitiesDaily();
  let fallbackPayload = null;

  const cached = await getJSON(key);
  if (hasUsableOpportunities(cached)) {
    if (!force) return cached;
    fallbackPayload = cached;
  } else {
    const fileCached = await readDailyFileCache();
    if (hasUsableOpportunities(fileCached.data)) {
      fallbackPayload = fileCached.data;

      if (!force && isFreshDailyCache(fileCached.fetchedAt)) {
        // Warm Redis back up from disk after a cache flush or restart.
        await setJSON(key, fileCached.data, CACHE_TTL.LISTINGS_DAILY);
        return fileCached.data;
      }
    }
  }

  if (opportunitiesRefreshPromise) {
    return opportunitiesRefreshPromise;
  }

  opportunitiesRefreshPromise = (async () => {
    let livePayload = [];

    try {
      livePayload = await fetchTechJobs(OPPORTUNITIES_FETCH_LIMIT);
    } catch (err) {
      console.error("[Listings] jobs fetch error:", err.message || err);
      livePayload = [];
    }

    if (!hasUsableOpportunities(livePayload)) {
      console.error("[Listings] live fetch returned nothing; serving snapshot");
      return hasUsableOpportunities(fallbackPayload) ? fallbackPayload : [];
    }

    await setJSON(key, livePayload, CACHE_TTL.LISTINGS_DAILY);
    await writeDailyFileCache(livePayload);
    return livePayload;
  })();

  try {
    return await opportunitiesRefreshPromise;
  } finally {
    opportunitiesRefreshPromise = null;
  }
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function paginate(items, limit, offset) {
  return items.slice(offset, offset + limit);
}

async function getHackathons(req, res) {
  try {
    const limit = toPositiveInt(req.query.limit, 50);
    const offset = toNonNegativeInt(req.query.offset, 0);
    const key = cacheKeys.hackathons({ limit, offset });

    const cached = await getJSON(key);
    if (cached !== null) {
      return res.json(cached);
    }

    const payload = paginate(hackathons, limit, offset);
    await setJSON(key, payload, CACHE_TTL.LISTINGS);
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

async function getOpportunities(req, res) {
  try {
    const limit = toPositiveInt(req.query.limit, 100);
    const offset = toNonNegativeInt(req.query.offset, 0);

    // refreshOpportunitiesCache already resolves cache -> disk -> live in order.
    const all = await refreshOpportunitiesCache({ force: false });

    return res.json(paginate(Array.isArray(all) ? all : [], limit, offset));
  } catch (err) {
    console.error("[Listings] getOpportunities error:", err.message || err);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  getHackathons,
  getOpportunities,
  refreshOpportunitiesCache,
};
