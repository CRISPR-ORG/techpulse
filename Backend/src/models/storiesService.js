const {
  supabase,
  isDatabaseReady,
  supportsStoryPublishedAt,
} = require("../config/supabaseClient");
const { fallbackStore } = require("./fallbackStore");
const { isTechArticle } = require("../services/utils/techFilter");

function isTechStory(story) {
  if (!story) return false;
  if (String(story.category || "").toLowerCase() === "campus-pulse") {
    return true;
  }
  return isTechArticle(story);
}

function sortByNewestFirst(stories = []) {
  return [...stories].sort((a, b) => storyTimestamp(b) - storyTimestamp(a));
}

/**
 * The feed shows each story's article publication time, so ordering has to use
 * that same value. `created_at` is ingest time, which drifts from publication
 * time and would let an older story surface above a newer one.
 */
function storyTimestamp(story) {
  const value = Date.parse(
    story?.effective_published_at || story?.created_at || story?.updated_at || "",
  );
  return Number.isNaN(value) ? 0 : value;
}

/**
 * Stamp each story with its newest article's published_at.
 * One extra lookup for the whole scanned window, not one per story.
 */
async function attachRecency(stories) {
  if (!Array.isArray(stories) || stories.length === 0) return stories;

  const recency = fallbackStore.getStoryRecencyMap();

  if (await isDatabaseReady()) {
    const ids = stories.map((story) => story.id);

    // Chunked so a large scan does not blow past request length limits.
    for (let i = 0; i < ids.length; i += 200) {
      try {
        const { data: rows, error } = await supabase
          .from("articles")
          .select("story_id, published_at")
          .in("story_id", ids.slice(i, i + 200));

        if (error || !Array.isArray(rows)) continue;

        for (const row of rows) {
          const at = Date.parse(row.published_at || "");
          if (Number.isNaN(at)) continue;

          const current = recency.get(row.story_id);
          if (current === undefined || at > current) {
            recency.set(row.story_id, at);
          }
        }
      } catch {
        // Keep whatever recency the local store already provided.
      }
    }
  }

  return stories.map((story) => {
    const at = recency.get(story.id);
    return {
      ...story,
      effective_published_at: at
        ? new Date(at).toISOString()
        : story.created_at || null,
    };
  });
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
// The tech filter runs in JS, not SQL, so a page has to be filled by scanning a
// window of recent stories and paginating the survivors. Paginating first would
// hand back a short page (20 rows in, ~13 tech stories out) and, worse, make the
// caller believe it had reached the end of the feed.
const MAX_STORY_SCAN = 1000;

/**
 * Ordered page of stories straight from the database.
 *
 * Available once migration 007 adds `stories.published_at`. Ingest already
 * decides what counts as tech, so nothing needs filtering afterwards and the
 * feed is a plain indexed ORDER BY / LIMIT / OFFSET - no scan ceiling, so the
 * feed can be paged through indefinitely.
 */
async function getStoriesFromDatabase(category, limit, offset) {
  let query = supabase.from("stories").select("*");

  if (category) {
    query = query.eq("category", category);
  } else {
    query = query.neq("category", "campus-pulse");
  }

  const { data, error } = await query
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return null;
  return Array.isArray(data) ? data : [];
}

async function getStories(category = null, limit = 20, offset = 0) {
  const ready = await isDatabaseReady();

  if (ready && (await supportsStoryPublishedAt())) {
    const page = await getStoriesFromDatabase(category, limit, offset);

    // An empty page is a real end-of-feed answer, so only fall through when
    // the query itself failed.
    if (page !== null) {
      return page.map((story) => ({
        ...story,
        effective_published_at: story.published_at || story.created_at,
      }));
    }
  }

  // Fallback: scan a fixed window and order in JS. Used before migration 007
  // and whenever the local store is serving.
  //
  // The window must be identical for every page. Sizing it from `offset` lets
  // a later page admit stories the earlier pages never considered, and because
  // the sort key (publication time) differs from the scan order (ingest time),
  // those stories resurface mid-feed as duplicates.
  const scanSize = MAX_STORY_SCAN;
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
        .range(0, scanSize - 1);

      if (!error && Array.isArray(data) && data.length > 0) {
        stories = data;
      }
    } catch (err) {
      stories = [];
    }
  }

  if (!stories || stories.length === 0) {
    stories = fallbackStore.getStories(category, scanSize, 0);
  }

  const ordered = sortByNewestFirst(await attachRecency(stories));

  if (category === "campus-pulse") {
    return ordered.slice(offset, offset + limit);
  }

  return ordered.filter(isTechStory).slice(offset, offset + limit);
}

/**
 * Count every tech story available, so callers can show a real total
 * instead of inferring the end of the feed from a short page.
 */
async function countStories(category = null) {
  const ready = await isDatabaseReady();

  if (ready) {
    try {
      let query = supabase
        .from("stories")
        .select("*", { count: "exact", head: true });

      if (category) {
        query = query.eq("category", category);
      } else {
        query = query.neq("category", "campus-pulse");
      }

      const { count, error } = await query;
      if (!error && Number.isFinite(count)) return count;
    } catch {
      // Fall through to the scan below.
    }
  }

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
        .range(0, MAX_STORY_SCAN - 1);

      if (!error && Array.isArray(data) && data.length > 0) {
        stories = data;
      }
    } catch (err) {
      stories = [];
    }
  }

  if (!stories || stories.length === 0) {
    stories = fallbackStore.getStories(category, MAX_STORY_SCAN, 0);
  }

  if (category === "campus-pulse") return stories.length;
  return stories.filter(isTechStory).length;
}

/**
 * Delete a story that has no articles, in whichever backend holds it.
 * Called when publishing fails after the story row was already created.
 */
async function deleteStoryIfEmpty(storyId) {
  if (!storyId) return false;

  const removedLocally = fallbackStore.deleteStoryIfEmpty(storyId);

  const ready = await isDatabaseReady();
  if (!ready) return removedLocally;

  try {
    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select("id")
      .eq("story_id", storyId)
      .limit(1);

    if (articlesError || (articles && articles.length > 0)) {
      return removedLocally;
    }

    const { error } = await supabase.from("stories").delete().eq("id", storyId);
    return !error;
  } catch (err) {
    return removedLocally;
  }
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
  countStories,
  sortByNewestFirst,
  deleteStoryIfEmpty,
  updateStorySourcesCount,
  getTrendingStories,
};
