const { supabase, isDatabaseReady } = require("../config/supabaseClient");
const { fallbackStore } = require("../models/fallbackStore");
const { getJSON, setJSON } = require("../services/cache/cacheService");
const { cacheKeys, CACHE_TTL } = require("../services/cache/cacheKeys");

async function searchStories(req, res) {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Query param q is required" });

    const normalizedQuery = String(q).trim();
    const key = cacheKeys.search({ q: normalizedQuery });
    const cached = await getJSON(key);
    if (cached !== null) {
      return res.json(cached);
    }

    let payload = [];
    const ready = await isDatabaseReady();

    if (ready) {
      try {
        const { data, error } = await supabase
          .from("stories")
          .select("*")
          .ilike("title", `%${normalizedQuery}%`);

        if (!error && Array.isArray(data) && data.length > 0) {
          payload = data;
        }
      } catch (err) {
        // ignore
      }
    }

    if (payload.length === 0) {
      payload = fallbackStore.searchStories(normalizedQuery);
    }

    await setJSON(key, payload, CACHE_TTL.SEARCH);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  searchStories,
};
