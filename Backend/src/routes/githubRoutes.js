const express = require("express");
const { getJSON, setJSON } = require("../services/cache/cacheService");
const { cacheKeys, CACHE_TTL } = require("../services/cache/cacheKeys");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const cacheKey = cacheKeys.githubOpportunitiesDaily();
    const cached = await getJSON(cacheKey);
    if (cached !== null) {
      return res.json(cached);
    }

    const token = process.env.GITHUB_TOKEN;
    const url =
      'https://api.github.com/search/issues?q=is:issue+is:open+label:"good+first+issue"+language:javascript,typescript+archived:false&sort=created&order=desc&per_page=12';

    const response = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        "User-Agent": "TechPulse-Backend",
        Accept: "application/vnd.github+json",
      },
    });

    if (response.status === 403) {
      return res
        .status(403)
        .json({ error: "Rate limit reached, try again in an hour" });
    }

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Failed to fetch from GitHub API" });
    }

    const data = await response.json();

    // Map the response to a clean shape the frontend expects
    const items = (data.items || []).map((item) => {
      let repoName = "unknown/repo";
      if (item.repository_url) {
        const parts = item.repository_url.split("/");
        if (parts.length >= 2) {
          repoName = parts.slice(-2).join("/");
        }
      }

      return {
        id: item.id,
        title: item.title,
        repoName,
        labels: (item.labels || []).map((l) => ({
          id: l.id,
          name: l.name,
          color: l.color,
        })),
        html_url: item.html_url,
      };
    });

    const payload = { total_count: data.total_count || 0, items };
    await setJSON(cacheKey, payload, CACHE_TTL.GITHUB_DAILY);
    res.json(payload);
  } catch (err) {
    console.error("GitHub API error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
