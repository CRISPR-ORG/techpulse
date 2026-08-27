const { getJSON, setJSON } = require("../services/cache/cacheService");
const { cacheKeys, CACHE_TTL } = require("../services/cache/cacheKeys");
const axios = require("axios");
const fs = require("fs/promises");
const path = require("path");
const { hackathons } = require("../data/listingsData");

const EXA_API_URL = "https://api.exa.ai/search";
const DAILY_EXA_FETCH_LIMIT = Number(
  process.env.EXA_OPPORTUNITIES_FETCH_LIMIT || 80,
);
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

function parseCompanyAndRole(title = "") {
  const normalized = String(title || "").trim();
  if (!normalized) {
    return { company: "Unknown Company", role: "Opportunity" };
  }

  const separators = [" at ", " - ", " | ", " @ "];
  for (const separator of separators) {
    const idx = normalized.toLowerCase().indexOf(separator);
    if (idx > 0) {
      const left = normalized.slice(0, idx).trim();
      const right = normalized.slice(idx + separator.length).trim();
      if (separator === " at " || separator === " @ ") {
        return {
          role: left || "Opportunity",
          company: right || "Unknown Company",
        };
      }

      return {
        company: left || "Unknown Company",
        role: right || left || "Opportunity",
      };
    }
  }

  return {
    company: "Unknown Company",
    role: normalized,
  };
}

function normalizeExaResult(item, index) {
  const { company, role } = parseCompanyAndRole(item?.title);
  const text = String(item?.text || "").toLowerCase();
  const type =
    /intern/.test(text) || /intern/.test(role.toLowerCase())
      ? "INTERNSHIP"
      : "FULL-TIME";

  return {
    id: item?.id || `EXA_${index + 1}`,
    type,
    company,
    role,
    location: "Remote/Global",
    mode: "REMOTE",
    stipend: "See listing",
    deadline: "Rolling",
    tags: ["Live", "Exa", "Tech"],
    applyUrl: item?.url || "#",
  };
}

async function fetchOpportunitiesFromExa(limit) {
  const exaApiKey = process.env.EXA_API_KEY;
  if (!exaApiKey) {
    return [];
  }

  const queries = [
    "latest software engineering internship opportunities remote and India",
    "latest software developer full-time openings backend frontend AI cloud remote",
  ];

  const perQuery = Math.max(3, Math.ceil(limit / queries.length));

  const responses = await Promise.allSettled(
    queries.map((query) =>
      axios.post(
        EXA_API_URL,
        {
          query,
          type: "deep",
          numResults: perQuery,
          contents: {
            text: {
              maxCharacters: 12000,
              verbosity: "full",
            },
            maxAgeHours: 24,
          },
        },
        {
          headers: {
            "x-api-key": exaApiKey,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        },
      ),
    ),
  );

  const failedCount = responses.filter(
    (result) => result.status === "rejected",
  ).length;
  if (failedCount > 0) {
    console.error(
      `[Listings] Exa deep search failed for ${failedCount} query(s)`,
    );
  }

  let merged = responses
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value?.data?.results || []);

  if (!Array.isArray(merged) || merged.length === 0) {
    try {
      const fallback = await axios.post(
        EXA_API_URL,
        {
          query: "latest software engineering internships and developer jobs",
          type: "auto",
          numResults: Math.max(10, Math.min(limit, 40)),
          contents: {
            highlights: {
              maxCharacters: 4000,
            },
            maxAgeHours: 24,
          },
        },
        {
          headers: {
            "x-api-key": exaApiKey,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        },
      );

      merged = fallback?.data?.results || [];
    } catch (err) {
      console.error(
        "[Listings] Exa fallback search error:",
        err.message || err,
      );
    }
  }

  const seen = new Set();
  const deduped = merged.filter((item) => {
    const url = String(item?.url || "").trim();
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  return deduped.slice(0, limit).map(normalizeExaResult);
}

async function refreshOpportunitiesCache({ force = false } = {}) {
  const key = cacheKeys.opportunitiesDaily();
  let fallbackPayload = null;

  if (!force) {
    const existing = await getJSON(key);
    if (hasUsableOpportunities(existing)) {
      fallbackPayload = existing;
      return existing;
    }

    const fileCached = await readDailyFileCache();
    fallbackPayload = fileCached.data;
    if (
      isFreshDailyCache(fileCached.fetchedAt) &&
      hasUsableOpportunities(fileCached.data)
    ) {
      return fileCached.data;
    }
  } else {
    const existing = await getJSON(key);
    if (hasUsableOpportunities(existing)) {
      fallbackPayload = existing;
    } else {
      const fileCached = await readDailyFileCache();
      fallbackPayload = hasUsableOpportunities(fileCached.data)
        ? fileCached.data
        : null;
    }
  }

  if (opportunitiesRefreshPromise) {
    return opportunitiesRefreshPromise;
  }

  opportunitiesRefreshPromise = (async () => {
    let livePayload = [];
    try {
      livePayload = await fetchOpportunitiesFromExa(DAILY_EXA_FETCH_LIMIT);
    } catch (err) {
      console.error("[Listings] Exa fetch error:", err.message || err);
      livePayload = [];
    }

    if (!hasUsableOpportunities(livePayload)) {
      if (hasUsableOpportunities(fallbackPayload)) {
        return fallbackPayload;
      }
      return [];
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

    let allCached = await getJSON(cacheKeys.opportunitiesDaily());

    if (allCached === null) {
      const fileCached = await readDailyFileCache();
      allCached = isFreshDailyCache(fileCached.fetchedAt)
        ? fileCached.data
        : [];
    }

    if (!Array.isArray(allCached) || allCached.length === 0) {
      allCached = await refreshOpportunitiesCache({ force: false });
    }

    // Final fallback: if today's fetch failed, serve last snapshot if present.
    if (!Array.isArray(allCached) || allCached.length === 0) {
      const fileCached = await readDailyFileCache();
      if (Array.isArray(fileCached.data) && fileCached.data.length > 0) {
        allCached = fileCached.data;
      }
    }

    const payload = paginate(allCached, limit, offset);
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  getHackathons,
  getOpportunities,
  refreshOpportunitiesCache,
};
