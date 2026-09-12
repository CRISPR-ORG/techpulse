const crypto = require("crypto");
const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const { canUseDiskCache } = require("../config/runtime");

const STORE_FILE = path.join(__dirname, "../../.cache/local-store.json");
const PERSIST_DEBOUNCE_MS = 1500;

// The RSS/NewsAPI worker inserts ~90 articles every run, so aggregated news is
// capped to keep the snapshot small. Admin-published content is never evicted.
const MAX_FEED_ARTICLES = 500;

/**
 * Active data store used whenever Supabase is unavailable.
 *
 * State is mirrored to disk so admin-published Campus Pulse posts survive a
 * restart. Without this, anything an admin publishes is lost when the process
 * exits, which makes the admin portal effectively useless until Supabase is
 * configured and its schema is set up.
 */
class FallbackStore {
  constructor({ persist = canUseDiskCache() } = {}) {
    this.sources = new Map(); // id -> source
    this.stories = new Map(); // id -> story
    this.articles = new Map(); // id -> article
    this.clicks = []; // array of { id, story_id, clicked_at }
    this.clickCounter = 1;

    this.persistEnabled = persist;
    this.persistTimer = null;
    this.persistInFlight = null;

    if (this.persistEnabled) {
      this.loadFromDisk();
    }
  }

  // ── Persistence ──

  loadFromDisk() {
    try {
      if (!fs.existsSync(STORE_FILE)) return;

      const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));

      for (const source of parsed.sources || []) {
        if (source?.id) this.sources.set(source.id, source);
      }
      for (const story of parsed.stories || []) {
        if (story?.id) this.stories.set(story.id, story);
      }
      for (const article of parsed.articles || []) {
        if (article?.id) this.articles.set(article.id, article);
      }

      this.clicks = Array.isArray(parsed.clicks) ? parsed.clicks : [];
      this.clickCounter =
        this.clicks.reduce((max, click) => Math.max(max, click?.id || 0), 0) + 1;

      const adminPosts = [...this.articles.values()].filter(
        (article) => article.is_admin_post,
      ).length;

      console.log(
        `[LocalStore] Restored ${this.stories.size} stories, ${this.articles.size} articles (${adminPosts} admin-published)`,
      );
    } catch (err) {
      console.error("[LocalStore] Load failed:", err.message || err);
    }
  }

  schedulePersist() {
    if (!this.persistEnabled) return;

    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }

    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.flush().catch((err) =>
        console.error("[LocalStore] Persist failed:", err.message || err),
      );
    }, PERSIST_DEBOUNCE_MS);

    // A pending snapshot must not hold the process open.
    if (typeof this.persistTimer.unref === "function") {
      this.persistTimer.unref();
    }
  }

  async flush() {
    if (!this.persistEnabled) return false;

    // Serialize writes so two flushes cannot interleave on the same file.
    if (this.persistInFlight) {
      await this.persistInFlight;
    }

    this.persistInFlight = (async () => {
      this.pruneFeedArticles();

      const snapshot = {
        version: 1,
        savedAt: new Date().toISOString(),
        sources: [...this.sources.values()],
        stories: [...this.stories.values()],
        articles: [...this.articles.values()],
        clicks: this.clicks.slice(-5000),
      };

      await fsPromises.mkdir(path.dirname(STORE_FILE), { recursive: true });

      // Write-then-rename keeps the snapshot readable if the process dies mid-write.
      const tempFile = `${STORE_FILE}.tmp`;
      await fsPromises.writeFile(tempFile, JSON.stringify(snapshot), "utf8");
      await fsPromises.rename(tempFile, STORE_FILE);

      return true;
    })();

    try {
      return await this.persistInFlight;
    } finally {
      this.persistInFlight = null;
    }
  }

  /**
   * Drop the oldest aggregated news once past the cap.
   * Admin posts and the stories they belong to are always kept.
   */
  pruneFeedArticles() {
    const feedArticles = [...this.articles.values()]
      .filter((article) => !article.is_admin_post)
      .sort(
        (a, b) =>
          new Date(b.published_at || 0) - new Date(a.published_at || 0),
      );

    if (feedArticles.length <= MAX_FEED_ARTICLES) return;

    for (const article of feedArticles.slice(MAX_FEED_ARTICLES)) {
      this.articles.delete(article.id);
    }

    // Remove stories that no longer have any article attached.
    const referencedStoryIds = new Set(
      [...this.articles.values()].map((article) => article.story_id),
    );

    for (const [storyId, story] of this.stories) {
      if (referencedStoryIds.has(storyId)) continue;
      if (story.category === "campus-pulse") continue;
      this.stories.delete(storyId);
    }

    this.clicks = this.clicks.filter((click) =>
      this.stories.has(click.story_id),
    );
  }

  // Sources
  getOrCreateSource(name, websiteUrl = null, rssUrl = null, logoUrl = null) {
    const trimmedName = String(name || "").trim();
    if (!trimmedName) return null;

    for (const source of this.sources.values()) {
      if (source.name.toLowerCase() === trimmedName.toLowerCase()) {
        return source.id;
      }
    }

    const id = crypto.randomUUID();
    const source = {
      id,
      name: trimmedName,
      website_url: websiteUrl,
      rss_url: rssUrl,
      logo_url: logoUrl,
      created_at: new Date().toISOString(),
    };
    this.sources.set(id, source);
    this.schedulePersist();
    return id;
  }

  getAllSources() {
    return Array.from(this.sources.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  // Stories
  getOrCreateStory(title, category = "technology", mainImage = null) {
    const trimmedTitle = String(title || "").trim();
    if (!trimmedTitle) return null;

    const normalizedCategory = String(category || "technology").toLowerCase();

    for (const story of this.stories.values()) {
      if (
        story.title.toLowerCase() === trimmedTitle.toLowerCase() &&
        story.category === normalizedCategory
      ) {
        return story.id;
      }
    }

    const id = crypto.randomUUID();
    const slug = trimmedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const now = new Date().toISOString();
    const story = {
      id,
      title: trimmedTitle,
      slug: slug || `story-${id.slice(0, 8)}`,
      category: normalizedCategory,
      main_image: mainImage,
      sources_count: 0,
      created_at: now,
      updated_at: now,
    };

    this.stories.set(id, story);
    this.schedulePersist();
    return id;
  }

  getStories(category = null, limit = 20, offset = 0) {
    let list = Array.from(this.stories.values());

    if (category) {
      const cat = String(category).toLowerCase();
      list = list.filter((s) => s.category === cat);
    } else {
      list = list.filter((s) => s.category !== "campus-pulse");
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list.slice(offset, offset + limit);
  }

  /**
   * Newest article timestamp per story, computed in one pass.
   * Used to order the feed by publication time rather than ingest time.
   */
  getStoryRecencyMap() {
    const recency = new Map();

    for (const article of this.articles.values()) {
      const at = Date.parse(article.published_at || article.created_at || "");
      if (Number.isNaN(at)) continue;

      const current = recency.get(article.story_id);
      if (current === undefined || at > current) {
        recency.set(article.story_id, at);
      }
    }

    return recency;
  }

  getStoryById(storyId) {
    return this.stories.get(storyId) || null;
  }

  /**
   * Remove a story that has no articles attached.
   * Used to clean up after a rejected publish so the Campus Pulse feed does
   * not show a titled entry with no content behind it.
   */
  deleteStoryIfEmpty(storyId) {
    if (!this.stories.has(storyId)) return false;

    for (const article of this.articles.values()) {
      if (article.story_id === storyId) return false;
    }

    this.stories.delete(storyId);
    this.clicks = this.clicks.filter((click) => click.story_id !== storyId);
    this.schedulePersist();
    return true;
  }

  updateStorySourcesCount(storyId) {
    const story = this.stories.get(storyId);
    if (!story) return false;

    const uniqueSources = new Set();
    for (const article of this.articles.values()) {
      if (article.story_id === storyId && article.source_name) {
        uniqueSources.add(article.source_name);
      }
    }

    story.sources_count = uniqueSources.size;
    story.updated_at = new Date().toISOString();
    this.schedulePersist();
    return true;
  }

  // Articles
  insertArticle(article, storyId) {
    const id = this.createArticle(article, storyId);
    return id;
  }

  /**
   * Shared insert used by both the news worker and the admin portal.
   * Returns the article id, or null when the URL already exists.
   */
  createArticle(article, storyId, { publishedByAdminId = null } = {}) {
    const url = String(article.url || "").trim();
    if (!url) return null;

    for (const item of this.articles.values()) {
      if (item.url.toLowerCase() === url.toLowerCase()) {
        return null; // Duplicate
      }
    }

    const id = crypto.randomUUID();
    const newArticle = {
      id,
      story_id: storyId,
      title: String(article.title || "").trim(),
      description: article.description?.trim() || null,
      url,
      source_name: String(article.source_name || "Unknown").trim(),
      image_url: article.image_url || null,
      published_at: article.published_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
      published_by_admin_id: publishedByAdminId,
      is_admin_post: Boolean(publishedByAdminId),
    };

    this.articles.set(id, newArticle);
    this.schedulePersist();
    return id;
  }

  /**
   * Publish an admin-authored article and return the full row,
   * matching what the Supabase insert returns.
   */
  insertAdminArticle(article, storyId, adminId) {
    const id = this.createArticle(article, storyId, {
      publishedByAdminId: adminId,
    });

    if (!id) return null;

    // Admin posts must reach disk immediately, not on the debounce.
    this.flush().catch((err) =>
      console.error("[LocalStore] Admin persist failed:", err.message || err),
    );

    return this.articles.get(id) || null;
  }

  getAdminArticles(adminId, limit = 20, offset = 0) {
    if (!adminId) return [];

    return Array.from(this.articles.values())
      .filter((article) => article.published_by_admin_id === adminId)
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
      .slice(offset, offset + limit);
  }

  getArticlesByStoryId(storyId, limit = 50, offset = 0) {
    const list = Array.from(this.articles.values())
      .filter((a) => a.story_id === storyId)
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

    return list.slice(offset, offset + limit);
  }

  getRecentArticles(limit = 50, offset = 0) {
    const list = Array.from(this.articles.values()).sort(
      (a, b) => new Date(b.published_at) - new Date(a.published_at)
    );
    return list.slice(offset, offset + limit);
  }

  getArticlesBySource(sourceName, limit = 50, offset = 0) {
    const target = String(sourceName).toLowerCase();
    const list = Array.from(this.articles.values())
      .filter((a) => a.source_name.toLowerCase() === target)
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

    return list.slice(offset, offset + limit);
  }

  // Clicks & Trending
  recordClick(storyId) {
    const id = this.clickCounter++;
    this.clicks.push({
      id,
      story_id: storyId,
      clicked_at: new Date().toISOString(),
    });
    this.schedulePersist();
    return id;
  }

  getClickCount(storyId) {
    return this.clicks.filter((c) => c.story_id === storyId).length;
  }

  getTrendingStories(days = 7, limit = 10) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recentClicks = this.clicks.filter(
      (c) => new Date(c.clicked_at).getTime() >= cutoff
    );

    const counts = new Map();
    for (const c of recentClicks) {
      counts.set(c.story_id, (counts.get(c.story_id) || 0) + 1);
    }

    const sortedStoryIds = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    const results = [];
    for (const id of sortedStoryIds) {
      const story = this.stories.get(id);
      if (story) {
        results.push({
          ...story,
          click_count: counts.get(id) || 0,
        });
      }
    }

    return results;
  }

  // Search
  searchStories(query, limit = 20) {
    const q = String(query || "").toLowerCase().trim();
    if (!q) return [];

    return Array.from(this.stories.values())
      .filter((s) => s.title.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  }
}

const fallbackStore = new FallbackStore();

module.exports = {
  fallbackStore,
  FallbackStore,
};
