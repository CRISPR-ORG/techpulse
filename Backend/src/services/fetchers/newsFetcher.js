const axios = require("axios");
require("dotenv").config();
const { isTechArticle } = require("../utils/techFilter");

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const BASE_URL = "https://newsapi.org/v2";

async function fetchNews() {
  if (!NEWS_API_KEY) {
    console.error("[NewsAPI] Missing NEWS_API_KEY");
    return [];
  }

  try {
    const result = await axios.get(`${BASE_URL}/top-headlines`, {
      params: {
        category: "technology",
        country: "us",
        language: "en",
        pageSize: 40,
        apiKey: NEWS_API_KEY,
      },
    });

    const rawArticles = Array.isArray(result.data?.articles)
      ? result.data.articles
      : [];

    const validArticles = rawArticles.filter(
      (article) =>
        article.title &&
        article.url &&
        article.title !== "[Removed]" &&
        isTechArticle(article),
    );

    const articles = validArticles.map((article) => ({
      title: article.title?.trim() || null,
      description:
        article.description?.trim() || article.content?.trim() || null,
      url: article.url || null,
      publishedAt: article.publishedAt || new Date().toISOString(),
      source: article.source?.name || "NewsApi",
      imageUrl: article.urlToImage || null,
      category: "technology",
      fetchedFrom: "newsAPI",
    }));

    console.log(`[NewsAPI] sent ${articles.length} articles`);
    return articles;
  } catch (err) {
    console.error(`[NewsAPI] fetch failed: ${err.message}`);
    return [];
  }
}

module.exports = { fetchNews };
