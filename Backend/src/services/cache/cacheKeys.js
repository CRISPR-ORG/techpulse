const CACHE_TTL = {
  STORIES: 120,
  TRENDING: 60,
  STORY_ARTICLES: 120,
  SOURCES: 600,
  SOURCE_STORIES: 180,
  SEARCH: 90,
  ARTICLE_BY_ID: 300,
  LISTINGS: 300,
  LISTINGS_DAILY: 86400,
  GITHUB_DAILY: 86400,
};

const cacheKeys = {
  stories: ({ category = "all", limit = 20, offset = 0 } = {}) =>
    `stories:${category}:${limit}:${offset}`,

  trending: ({ days = 7, limit = 10 } = {}) => `trending:${days}:${limit}`,

  storyArticles: ({ storyId, limit = 50, offset = 0 }) =>
    `story_articles:${storyId}:${limit}:${offset}`,

  sources: () => "sources:all",

  sourceStories: ({ sourceName, limit = 50, offset = 0 }) =>
    `source_stories:${sourceName}:${limit}:${offset}`,

  search: ({ q }) =>
    `search:${String(q || "")
      .trim()
      .toLowerCase()}`,

  articleById: ({ articleId }) => `article:${articleId}`,

  hackathons: ({ limit = 50, offset = 0 } = {}) =>
    `listings:hackathons:${limit}:${offset}`,

  opportunities: ({ limit = 100, offset = 0 } = {}) =>
    `listings:opportunities:${limit}:${offset}`,

  opportunitiesDaily: () => "listings:opportunities:daily",

  githubOpportunitiesDaily: () => "github:opportunities:daily",
};

module.exports = {
  CACHE_TTL,
  cacheKeys,
};
