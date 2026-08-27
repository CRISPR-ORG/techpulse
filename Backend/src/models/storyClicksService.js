const { supabase, isDatabaseReady } = require("../config/supabaseClient");
const { fallbackStore } = require("./fallbackStore");

function aggregateClicks(rows = []) {
  const counts = new Map();

  for (const row of rows) {
    const storyId = row?.story_id;
    if (!storyId) continue;
    counts.set(storyId, (counts.get(storyId) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([story_id, click_count]) => ({ story_id, click_count }))
    .sort((a, b) => b.click_count - a.click_count);
}

/**
 * Record a click event for a story
 */
async function recordClick(storyId) {
  const fallbackId = fallbackStore.recordClick(storyId);

  const ready = await isDatabaseReady();
  if (!ready) {
    return fallbackId;
  }

  try {
    const { data, error } = await supabase
      .from("story_clicks")
      .insert([
        {
          story_id: storyId,
          clicked_at: new Date().toISOString(),
        },
      ])
      .select("id")
      .single();

    if (error) {
      return fallbackId;
    }

    return data.id;
  } catch (err) {
    return fallbackId;
  }
}

/**
 * Get click count for a story
 */
async function getClickCount(storyId) {
  const ready = await isDatabaseReady();
  if (ready) {
    try {
      const { data, error } = await supabase
        .from("story_clicks")
        .select("id", { count: "exact" })
        .eq("story_id", storyId);

      if (!error && data) {
        return data.length;
      }
    } catch (err) {
      // ignore
    }
  }

  return fallbackStore.getClickCount(storyId);
}

/**
 * Get top clicked stories in last N days
 */
async function getTopClickedStories(days = 7, limit = 10) {
  const ready = await isDatabaseReady();
  if (ready) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("story_clicks")
        .select("story_id")
        .gte("clicked_at", startDate.toISOString())
        .order("clicked_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return aggregateClicks(data).slice(0, limit);
      }
    } catch (err) {
      // ignore
    }
  }

  const trendingStories = fallbackStore.getTrendingStories(days, limit);
  return trendingStories.map((s) => ({
    story_id: s.id,
    click_count: s.click_count || 0,
  }));
}

module.exports = {
  recordClick,
  getClickCount,
  getTopClickedStories,
};
