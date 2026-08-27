const { supabase, isDatabaseReady } = require("../config/supabaseClient");
const { fallbackStore } = require("./fallbackStore");
const { isTechArticle } = require("../services/utils/techFilter");

function isTechStory(story) {
  if (!story) return false;
  if (String(story.category || "").toLowerCase() === "campus-pulse") {
    return true;
  }
  return isTechArticle(story);
}

function aggregateClicks(rows = []) {
  const counts = new Map();

  for (const row of rows) {
    const storyId = row?.story_id;
    if (!storyId) continue;
    counts.set(storyId, (counts.get(storyId) || 0) + 1);
  }

  return counts;
}

/**
 * Create or retrieve a story by title and category
 * Returns story ID for article linking
 */
async function getOrCreateStory(title, category = "technology", mainImage = null) {
  const fallbackId = fallbackStore.getOrCreateStory(title, category, mainImage);

  const ready = await isDatabaseReady();
  if (!ready) {
    return fallbackId;
  }

  try {
    const slug = String(title || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const { data: existing, error: searchError } = await supabase
      .from("stories")
      .select("id")
      .eq("title", title)
      .eq("category", category)
      .limit(1);

    if (searchError) {
      return fallbackId;
    }

    if (existing && existing.length > 0) {
      return existing[0].id;
    }

    const { data: newStory, error: insertError } = await supabase
      .from("stories")
      .insert([
        {
          title,
          slug: slug || `story-${Date.now()}`,
          category,
          main_image: mainImage,
          sources_count: 0,
        },
      ])
      .select("id")
      .single();

    if (insertError) {
      return fallbackId;
    }

    return newStory.id;
  } catch (err) {
    return fallbackId;
  }
}

/**
 * Get stories with optional filters and pagination
 */
async function getStories(category = null, limit = 20, offset = 0) {
  const ready = await isDatabaseReady();
  let stories = [];

  if (ready) {
    try {
      let query = supabase.from("stories").select("*");

      if (category) {
        query = query.eq("category", category);
      } else {
        query = query.neq("category", "campus-pulse");
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && Array.isArray(data) && data.length > 0) {
        stories = data;
      }
    } catch (err) {
      stories = [];
    }
  }

  if (!stories || stories.length === 0) {
    stories = fallbackStore.getStories(category, limit, offset);
  }

  if (category === "campus-pulse") {
    return stories;
  }

  return stories.filter(isTechStory);
}

/**
 * Update story's sources_count
 */
async function updateStorySourcesCount(storyId) {
  fallbackStore.updateStorySourcesCount(storyId);

  const ready = await isDatabaseReady();
  if (!ready) {
    return true;
  }

  try {
    const { error } = await supabase.rpc("refresh_story_sources_count", {
      target_story_id: storyId,
    });

    if (error) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Get trending stories by clicks in last N days
 */
async function getTrendingStories(days = 7, limit = 10) {
  const ready = await isDatabaseReady();
  let stories = [];

  if (ready) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: clicksRows, error } = await supabase
        .from("story_clicks")
        .select("story_id")
        .gte("clicked_at", startDate.toISOString())
        .order("clicked_at", { ascending: false });

      if (!error && Array.isArray(clicksRows) && clicksRows.length > 0) {
        const clickCounts = aggregateClicks(clicksRows);
        const rankedStoryIds = [...clickCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([storyId]) => storyId);

        if (rankedStoryIds.length > 0) {
          const { data: dbStories, error: storyError } = await supabase
            .from("stories")
            .select("*")
            .in("id", rankedStoryIds);

          if (!storyError && Array.isArray(dbStories)) {
            const storyMap = new Map(dbStories.map((story) => [story.id, story]));
            stories = rankedStoryIds
              .map((storyId) => {
                const story = storyMap.get(storyId);
                if (!story) return null;
                return {
                  ...story,
                  click_count: clickCounts.get(storyId) || 0,
                };
              })
              .filter(Boolean);
          }
        }
      }
    } catch (err) {
      stories = [];
    }
  }

  if (!stories || stories.length === 0) {
    stories = fallbackStore.getTrendingStories(days, limit);
  }

  return stories.filter(isTechStory);
}

module.exports = {
  getOrCreateStory,
  getStories,
  updateStorySourcesCount,
  getTrendingStories,
};
