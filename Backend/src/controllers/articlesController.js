const { supabase } = require("../models");
const { getJSON, setJSON } = require("../services/cache/cacheService");
const { cacheKeys, CACHE_TTL } = require("../services/cache/cacheKeys");

async function getArticleById(req, res) {
  try {
    const articleId = req.params.id;
    const key = cacheKeys.articleById({ articleId });
    const cached = await getJSON(key);

    if (cached !== null) {
      return res.json(cached);
    }

    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", articleId)
      .single();

    if (error || !data)
      return res.status(404).json({ error: "Article not found" });

    await setJSON(key, data, CACHE_TTL.ARTICLE_BY_ID);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  getArticleById,
};
