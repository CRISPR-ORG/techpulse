const crypto = require("crypto");

class FallbackStore {
  constructor() {
    this.sources = new Map(); // id -> source
    this.stories = new Map(); // id -> story
    this.articles = new Map(); // id -> article
    this.clicks = []; // array of { id, story_id, clicked_at }
    this.clickCounter = 1;
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
    return true;
  }

  // Articles
  insertArticle(article, storyId) {
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
    };

    this.articles.set(id, newArticle);
    return id;
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
