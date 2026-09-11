const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/+$/,
  "",
);

function buildPathWithQuery(path, params = {}) {
  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });

  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

async function apiRequest(path, options = {}) {
  const { token, body, headers: inputHeaders, ...requestOptions } = options;
  const headers = new Headers(inputHeaders || {});
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (!isFormData && body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...requestOptions,
    headers,
    body: isFormData || body === undefined ? body : JSON.stringify(body),
  });

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`;
    try {
      const payload = await response.json();
      throw new Error(payload?.error || fallback);
    } catch {
      throw new Error(fallback);
    }
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function getNumericClickCount(story) {
  const candidates = [
    story?.click_count,
    story?.clicks_count,
    story?.clicks,
    story?.views,
  ];

  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return 0;
}

function toTimestamp(value) {
  const parsed = new Date(value || "").getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export const newsApi = {
  getStories({ limit = 20, offset = 0, includeLead = false } = {}) {
    return apiRequest(
      buildPathWithQuery("/stories", {
        limit,
        offset,
        include: includeLead ? "lead" : undefined,
      }),
    );
  },

  getStoriesCount() {
    return apiRequest("/stories/count");
  },

  getCampusPulseStories({ limit = 20, offset = 0 } = {}) {
    return apiRequest(
      buildPathWithQuery("/stories/campus-pulse", {
        limit,
        offset,
      }),
    );
  },

  getStoriesByCategory(category) {
    return apiRequest(`/stories/category/${encodeURIComponent(category)}`);
  },

  getTrendingStories() {
    return apiRequest("/stories/trending");
  },

  getStoryArticles(storyId) {
    return apiRequest(`/stories/${storyId}/articles`);
  },

  getSources() {
    return apiRequest("/sources");
  },

  searchStories(query) {
    return apiRequest(`/search?q=${encodeURIComponent(query)}`);
  },

  getArticleById(articleId) {
    return apiRequest(`/articles/${articleId}`);
  },

  trackStoryClick(storyId) {
    const url = `${API_BASE}/stories/${encodeURIComponent(storyId)}`;

    return fetch(url, {
      method: "GET",
      keepalive: true,
    }).catch(() => null);
  },
};

export const listingsApi = {
  getHackathons() {
    return apiRequest("/listings/hackathons");
  },

  getOpportunities({ limit = 20, offset = 0 } = {}) {
    return apiRequest(
      buildPathWithQuery("/listings/opportunities", {
        limit,
        offset,
      }),
    );
  },
};

export const openSourceApi = {
  getOpportunities() {
    return apiRequest("/github-opportunities");
  },
};

export const subscribeApi = {
  subscribe(email) {
    return apiRequest("/subscribe", {
      method: "POST",
      body: { email },
    });
  },
};

export const adminApi = {
  login(username, password) {
    return apiRequest("/admin/login", {
      method: "POST",
      body: {
        username,
        password,
      },
    });
  },

  getMe(token) {
    return apiRequest("/admin/me", {
      token,
    });
  },

  publishNews(token, payload) {
    return apiRequest("/admin/news", {
      method: "POST",
      token,
      body: payload,
    });
  },

  getMyPublishedNews(token, { limit = 20, offset = 0 } = {}) {
    return apiRequest(
      buildPathWithQuery("/admin/news", {
        limit,
        offset,
      }),
      {
        token,
      },
    );
  },
};

function toRelativeTime(isoValue) {
  if (!isoValue) return "recent";

  const now = Date.now();
  const input = new Date(isoValue).getTime();
  if (Number.isNaN(input)) return "recent";

  const diffMs = Math.max(0, now - input);
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) return `${Math.max(1, diffMinutes)}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function truncateDescription(value, maxLength = 180) {
  if (!value || typeof value !== "string") return "";
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.length <= maxLength) return cleaned;

  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const boundary =
    lastSpace > maxLength * 0.7 ? truncated.slice(0, lastSpace) : truncated;
  return `${boundary.trim()}...`;
}

export async function buildStoryCards(stories, trendingIds = new Set()) {
  const cards = await Promise.all(
    (stories || []).map(async (story, index) => {
      // `lead_article` is inlined by /stories?include=lead. Only fall back to a
      // per-story request when the caller did not ask for it.
      let leadArticle = story.lead_article || null;

      if (!leadArticle && !("lead_article" in story)) {
        try {
          const articles = await newsApi.getStoryArticles(story.id);
          if (Array.isArray(articles) && articles.length > 0) {
            leadArticle = articles[0];
          }
        } catch {
          leadArticle = null;
        }
      }

      const sourceName = String(leadArticle?.source_name || "").trim();
      const articleUrl = String(leadArticle?.url || "").trim();

      // Only display news stories where a real source is available
      const hasValidSource = Boolean(
        sourceName &&
        sourceName !== "0 sources" &&
        sourceName.toLowerCase() !== "unknown" &&
        articleUrl &&
        articleUrl !== "#" &&
        !articleUrl.startsWith("javascript:")
      );

      if (!hasValidSource) {
        return null;
      }

      const isTrending = trendingIds.has(story.id);
      const tag = isTrending ? "TRENDING" : index < 2 ? "BREAKING" : "NEW";
      const publishedAt = leadArticle?.published_at || story.created_at;
      const rawDescription = leadArticle?.description || "";
      const description =
        truncateDescription(rawDescription, 180) ||
        "Click to read full story coverage.";

      return {
        id: story.id,
        category: story.category || "GENERAL",
        tag,
        title: story.title,
        source: sourceName,
        publishedAt,
        time: toRelativeTime(publishedAt),
        description,
        url: articleUrl,
      };
    }),
  );

  return cards.filter(Boolean);
}

/** Newest first, by the timestamp each card actually displays. */
export function sortCardsByNewest(cards = []) {
  return [...cards].sort(
    (a, b) => toTimestamp(b.publishedAt) - toTimestamp(a.publishedAt),
  );
}

export function sortStoriesByClicks(stories = [], trendingStories = []) {
  const clickMap = new Map();
  const rankMap = new Map();

  (trendingStories || []).forEach((story, index) => {
    clickMap.set(story.id, getNumericClickCount(story));
    rankMap.set(story.id, index);
  });

  return [...(stories || [])].sort((a, b) => {
    const clickDiff = (clickMap.get(b.id) || 0) - (clickMap.get(a.id) || 0);
    if (clickDiff !== 0) return clickDiff;

    const aRank = rankMap.has(a.id)
      ? rankMap.get(a.id)
      : Number.MAX_SAFE_INTEGER;
    const bRank = rankMap.has(b.id)
      ? rankMap.get(b.id)
      : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;

    return toTimestamp(b.created_at) - toTimestamp(a.created_at);
  });
}
