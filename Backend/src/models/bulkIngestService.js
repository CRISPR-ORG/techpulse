const crypto = require("crypto");
const {
  supabase,
  isDatabaseReady,
  supportsStoryPublishedAt,
} = require("../config/supabaseClient");
const { fallbackStore } = require("./fallbackStore");

// Supabase filters travel in the query string, so `.in()` lists have to stay
// well under URL length limits.
const QUERY_CHUNK = 150;
const INSERT_CHUNK = 300;

// Article URLs are long and vary wildly in length, so batching them by count
// produces request URIs big enough that the connection is reset mid-flight
// ("TypeError: fetch failed"). Budget by characters instead.
const URL_FILTER_BUDGET = 2000;

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Split values so each batch stays within a total character budget. */
function chunkByLength(values, budget) {
  const out = [];
  let current = [];
  let used = 0;

  for (const value of values) {
    const cost = String(value).length + 3; // value plus separator/quoting
    if (current.length > 0 && used + cost > budget) {
      out.push(current);
      current = [];
      used = 0;
    }
    current.push(value);
    used += cost;
  }

  if (current.length > 0) out.push(current);
  return out;
}

function slugBase(title) {
  return String(title || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Slugs carry a hash of the title because `stories.slug` is UNIQUE and two
 * different headlines can reduce to the same base slug. Deriving the suffix
 * from the title (rather than a random value) keeps it stable across runs, so
 * re-ingesting the same story finds the existing row instead of duplicating it.
 */
function buildSlug(title) {
  const hash = crypto
    .createHash("sha1")
    .update(String(title || ""))
    .digest("hex")
    .slice(0, 8);

  const base = slugBase(title);
  return base ? `${base}-${hash}` : `story-${hash}`;
}

function normalizeUrl(url) {
  return String(url || "").trim();
}

/**
 * De-duplicate within the incoming batch before touching the database:
 * feeds overlap heavily, and the same story often arrives from several sources.
 */
function dedupeCandidates(articles) {
  const byUrl = new Map();

  for (const article of articles) {
    const url = normalizeUrl(article.url);
    const title = String(article.title || "").trim();
    if (!url || !title || !article.source_name) continue;

    if (!byUrl.has(url)) {
      byUrl.set(url, { ...article, url, title, slug: buildSlug(title) });
    }
  }

  return [...byUrl.values()];
}

async function selectWithRetry(build, label, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const { data, error } = await build();
    if (!error) return data || [];

    if (attempt === attempts) {
      console.error(`[Ingest] ${label} failed:`, error.message);
      return null;
    }

    await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
  }

  return null;
}

async function findExistingUrls(urls) {
  const found = new Set();

  for (const part of chunkByLength(urls, URL_FILTER_BUDGET)) {
    const rows = await selectWithRetry(
      () => supabase.from("articles").select("url").in("url", part),
      "URL lookup",
    );

    // A null result means the chunk is unknown, not that it is new. The
    // article upsert below still refuses duplicates, so this stays correct.
    for (const row of rows || []) found.add(row.url);
  }

  return found;
}

async function findExistingStorySlugs(slugs) {
  const map = new Map();

  for (const part of chunk(slugs, QUERY_CHUNK)) {
    const rows = await selectWithRetry(
      () => supabase.from("stories").select("id, slug").in("slug", part),
      "Story lookup",
    );

    for (const row of rows || []) map.set(row.slug, row.id);
  }

  return map;
}

async function insertStories(rows) {
  const map = new Map();

  for (const part of chunk(rows, INSERT_CHUNK)) {
    const { data, error } = await supabase
      .from("stories")
      .insert(part)
      .select("id, slug");

    if (error) {
      console.error("[Ingest] Story insert failed:", error.message);
      continue;
    }

    for (const row of data || []) map.set(row.slug, row.id);
  }

  return map;
}

async function insertArticles(rows) {
  let inserted = 0;

  for (const part of chunk(rows, INSERT_CHUNK)) {
    // A concurrent run may have claimed some URLs since the lookup above.
    const { data, error } = await supabase
      .from("articles")
      .upsert(part, { onConflict: "url", ignoreDuplicates: true })
      .select("id");

    if (error) {
      console.error("[Ingest] Article insert failed:", error.message);
      continue;
    }

    inserted += (data || []).length;
  }

  return inserted;
}

/**
 * Delete stories created during this run that ended up with no article.
 *
 * A story row has to exist before its article can reference it, so a story is
 * written first and the article second. When the article turns out to be a
 * duplicate (or its insert fails), the story is left behind with nothing to
 * show - and because its published_at is the ingest time, it sorts straight to
 * the top of the feed as an empty card.
 */
async function removeStoriesWithoutArticles(storyIds) {
  if (storyIds.length === 0) return 0;

  const linked = new Set();

  for (const part of chunk(storyIds, QUERY_CHUNK)) {
    const rows = await selectWithRetry(
      () => supabase.from("articles").select("story_id").in("story_id", part),
      "Orphan check",
    );

    // A failed check must not delete stories that may well have articles.
    if (rows === null) {
      part.forEach((id) => linked.add(id));
      continue;
    }

    for (const row of rows) linked.add(row.story_id);
  }

  const orphans = storyIds.filter((id) => !linked.has(id));
  if (orphans.length === 0) return 0;

  let removed = 0;
  for (const part of chunk(orphans, QUERY_CHUNK)) {
    const { error } = await supabase.from("stories").delete().in("id", part);
    if (error) {
      console.error("[Ingest] Orphan cleanup failed:", error.message);
      continue;
    }
    removed += part.length;
  }

  return removed;
}

/**
 * Sweep the whole table for stories with no article and delete them.
 *
 * `removeStoriesWithoutArticles` only covers stories created by the current
 * run. This catches anything left behind by an interrupted run, an older build
 * of the worker, or a failed article insert. Orphans matter out of proportion
 * to their number: their published_at is the ingest time, so they sort to the
 * very top of the feed and are the first cards a reader sees.
 */
async function sweepOrphanStories({ limit = 5000 } = {}) {
  if (!(await isDatabaseReady())) return 0;

  const ids = [];
  let from = 0;

  while (ids.length < limit) {
    const rows = await selectWithRetry(
      () =>
        supabase
          .from("stories")
          .select("id")
          .neq("category", "campus-pulse")
          .range(from, from + 999),
      "Orphan sweep scan",
    );

    if (!rows || rows.length === 0) break;

    ids.push(...rows.map((row) => row.id));
    from += rows.length;
    if (rows.length < 1000) break;
  }

  if (ids.length === 0) return 0;
  return removeStoriesWithoutArticles(ids);
}

/**
 * Persist a batch of fetched articles.
 *
 * Set-based on purpose: the per-article path costs three round trips each,
 * which at ~200ms per call is over ten minutes for a 1,200-article run. This
 * does the same work in roughly twenty queries.
 */
async function ingestArticles(articles) {
  const candidates = dedupeCandidates(articles);

  if (candidates.length === 0) {
    return { candidates: 0, inserted: 0, skipped: 0 };
  }

  if (!(await isDatabaseReady())) {
    let inserted = 0;

    for (const article of candidates) {
      const storyId = fallbackStore.getOrCreateStory(
        article.title,
        article.category,
        article.image_url,
      );
      if (!storyId) continue;

      if (fallbackStore.insertArticle(article, storyId)) {
        fallbackStore.updateStorySourcesCount(storyId);
        inserted += 1;
      }
    }

    return {
      candidates: candidates.length,
      inserted,
      skipped: candidates.length - inserted,
      backend: "local",
    };
  }

  const existingUrls = await findExistingUrls(candidates.map((a) => a.url));
  const fresh = candidates.filter((a) => !existingUrls.has(a.url));

  if (fresh.length === 0) {
    return {
      candidates: candidates.length,
      inserted: 0,
      skipped: candidates.length,
      backend: "supabase",
    };
  }

  const slugs = [...new Set(fresh.map((a) => a.slug))];
  const slugToStoryId = await findExistingStorySlugs(slugs);

  const withPublishedAt = await supportsStoryPublishedAt();
  const newStoryRows = [];
  const seenSlugs = new Set();

  for (const article of fresh) {
    if (slugToStoryId.has(article.slug) || seenSlugs.has(article.slug)) continue;

    seenSlugs.add(article.slug);
    newStoryRows.push({
      title: article.title,
      slug: article.slug,
      category: article.category || "technology",
      main_image: article.image_url || null,
      // Each ingested story starts with the one article that created it.
      sources_count: 1,
      // Lets the feed order and paginate in the database (migration 007).
      ...(withPublishedAt
        ? { published_at: article.published_at || new Date().toISOString() }
        : {}),
    });
  }

  const createdStoryIds = [];

  if (newStoryRows.length > 0) {
    const created = await insertStories(newStoryRows);
    for (const [slug, id] of created) {
      slugToStoryId.set(slug, id);
      createdStoryIds.push(id);
    }
  }

  const articleRows = fresh
    .filter((article) => slugToStoryId.has(article.slug))
    .map((article) => ({
      story_id: slugToStoryId.get(article.slug),
      title: article.title,
      description: article.description || null,
      url: article.url,
      source_name: article.source_name,
      image_url: article.image_url || null,
      published_at: article.published_at || new Date().toISOString(),
    }));

  const inserted = await insertArticles(articleRows);
  const orphansRemoved = await removeStoriesWithoutArticles(createdStoryIds);

  return {
    candidates: candidates.length,
    inserted,
    skipped: candidates.length - inserted,
    storiesCreated: createdStoryIds.length - orphansRemoved,
    orphansRemoved,
    backend: "supabase",
  };
}

module.exports = {
  ingestArticles,
  sweepOrphanStories,
  buildSlug,
  dedupeCandidates,
};
