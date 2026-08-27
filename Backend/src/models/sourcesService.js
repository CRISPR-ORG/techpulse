const { supabase, isDatabaseReady } = require("../config/supabaseClient");
const { fallbackStore } = require("./fallbackStore");

/**
 * Get or create a source by name
 */
async function getOrCreateSource(
  name,
  websiteUrl = null,
  rssUrl = null,
  logoUrl = null,
) {
  const fallbackId = fallbackStore.getOrCreateSource(
    name,
    websiteUrl,
    rssUrl,
    logoUrl,
  );

  const ready = await isDatabaseReady();
  if (!ready) {
    return fallbackId;
  }

  try {
    const { data: existing, error: searchError } = await supabase
      .from("sources")
      .select("id")
      .eq("name", name)
      .limit(1);

    if (searchError) {
      return fallbackId;
    }

    if (existing && existing.length > 0) {
      return existing[0].id;
    }

    const { data: newSource, error: insertError } = await supabase
      .from("sources")
      .insert([
        {
          name,
          website_url: websiteUrl,
          rss_url: rssUrl,
          logo_url: logoUrl,
        },
      ])
      .select("id")
      .single();

    if (insertError) {
      return fallbackId;
    }

    return newSource.id;
  } catch (err) {
    return fallbackId;
  }
}

/**
 * Get all sources
 */
async function getAllSources() {
  const ready = await isDatabaseReady();
  if (!ready) {
    return fallbackStore.getAllSources();
  }

  try {
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .order("name", { ascending: true });

    if (error || !data || data.length === 0) {
      return fallbackStore.getAllSources();
    }

    return data;
  } catch (err) {
    return fallbackStore.getAllSources();
  }
}

/**
 * Seed sources from RSS feeds
 */
async function seedRssSources(rssSources) {
  const results = [];

  for (const source of rssSources) {
    const sourceId = await getOrCreateSource(
      source.name,
      null, // website_url
      source.url, // rss_url
      null, // logo_url
    );

    if (sourceId) {
      results.push({ name: source.name, id: sourceId });
    }
  }

  return results;
}

module.exports = {
  getOrCreateSource,
  getAllSources,
  seedRssSources,
};
