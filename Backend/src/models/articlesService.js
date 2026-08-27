const { supabase, isDatabaseReady } = require("../config/supabaseClient");
const { fallbackStore } = require("./fallbackStore");

/**
 * Insert article if URL is unique
 * Returns article ID on success, null on duplicate
 */
async function insertArticle(article, storyId) {
  const fallbackId = fallbackStore.insertArticle(article, storyId);

  const ready = await isDatabaseReady();
  if (!ready) {
    return fallbackId;
  }

  try {
    const { title, description, url, source_name, image_url, published_at } =
      article;

    const { data: existing, error: searchError } = await supabase
      .from("articles")
      .select("id")
      .eq("url", url)
      .limit(1);

    if (searchError) {
      return fallbackId;
    }

    if (existing && existing.length > 0) {
      return null; // Duplicate
    }

    const { data: newArticle, error: insertError } = await supabase
      .from("articles")
      .insert([
        {
          story_id: storyId,
          title,
          description,
          url,
          source_name,
          image_url,
          published_at: published_at || new Date().toISOString(),
        },
      ])
      .select("id")
      .single();

    if (insertError) {
      return fallbackId;
    }

    return newArticle.id;
  } catch (err) {
    return fallbackId;
  }
}

/**
 * Get articles for a story
 */
async function getArticlesByStoryId(storyId, limit = 50, offset = 0) {
  const ready = await isDatabaseReady();
  if (ready) {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("story_id", storyId)
        .order("published_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (err) {
      // ignore
    }
  }

  return fallbackStore.getArticlesByStoryId(storyId, limit, offset);
}

/**
 * Get recent articles across all stories
 */
async function getRecentArticles(limit = 50, offset = 0) {
  const ready = await isDatabaseReady();
  if (ready) {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("published_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (err) {
      // ignore
    }
  }

  return fallbackStore.getRecentArticles(limit, offset);
}

/**
 * Get articles by source name
 */
async function getArticlesBySource(sourceName, limit = 50, offset = 0) {
  const ready = await isDatabaseReady();
  if (ready) {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("source_name", sourceName)
        .order("published_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (err) {
      // ignore
    }
  }

  return fallbackStore.getArticlesBySource(sourceName, limit, offset);
}

module.exports = {
  insertArticle,
  getArticlesByStoryId,
  getRecentArticles,
  getArticlesBySource,
};
