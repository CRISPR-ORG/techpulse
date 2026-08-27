const jwt = require("jsonwebtoken");
const { adminService, storiesService } = require("../models");
const { deleteByPattern } = require("../services/cache/cacheService");
const { JWT_SECRET } = require("../middleware/adminAuth");

const CAMPUS_PULSE_CATEGORY = "campus-pulse";

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeOptionalText(value) {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

function isValidHttpUrl(url) {
  return /^https?:\/\//i.test(url);
}

function buildAdminResponse(admin, fallbackUsername = null) {
  return {
    id: admin.admin_id || admin.id,
    username: admin.username || fallbackUsername,
    email: admin.email || null,
    role: admin.role || "admin",
  };
}

async function invalidateNewsCache(storyId, articleId) {
  await Promise.allSettled([
    deleteByPattern("stories:*"),
    deleteByPattern("trending:*"),
    deleteByPattern("search:*"),
    deleteByPattern(`story_articles:${storyId}:*`),
    deleteByPattern(`article:${articleId}`),
  ]);
}

async function adminLogin(req, res) {
  try {
    const username = normalizeText(req.body.username).toLowerCase();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "username and password are required" });
    }

    const admin = await adminService.verifyAdminLogin(username, password);
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const adminPayload = buildAdminResponse(admin, username);
    const token = jwt.sign(
      {
        adminId: adminPayload.id,
        username: adminPayload.username,
        email: adminPayload.email,
        role: adminPayload.role,
        authSource: admin.auth_source || "database",
      },
      JWT_SECRET,
      { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || "12h" },
    );

    return res.json({
      token,
      admin: adminPayload,
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

async function getAdminMe(req, res) {
  try {
    const admin = await adminService.getAdminById(req.admin.adminId);
    if (admin && admin.is_active !== false) {
      return res.json(buildAdminResponse(admin, req.admin.username || null));
    }

    if (req.admin.authSource === "env") {
      return res.json({
        id: req.admin.adminId,
        username: req.admin.username || null,
        email: req.admin.email || null,
        role: req.admin.role || "admin",
      });
    }

    return res.status(404).json({ error: "Admin not found" });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

async function publishAdminNews(req, res) {
  try {
    const title = normalizeText(req.body.title);
    const description = normalizeText(req.body.description);
    const url = normalizeText(req.body.url);
    const sourceName =
      normalizeOptionalText(req.body.sourceName) || "Campus Pulse Admin";
    const imageUrl = normalizeOptionalText(req.body.imageUrl);
    const mainImage = normalizeOptionalText(req.body.mainImage) || imageUrl;
    const publishedAtInput = normalizeOptionalText(req.body.publishedAt);

    if (!title || !description || !url) {
      return res.status(400).json({
        error: "title, description and url are required",
      });
    }

    if (!isValidHttpUrl(url)) {
      return res
        .status(400)
        .json({ error: "url must start with http:// or https://" });
    }

    let publishedAt = null;
    if (publishedAtInput) {
      const timestamp = Date.parse(publishedAtInput);
      if (Number.isNaN(timestamp)) {
        return res
          .status(400)
          .json({ error: "publishedAt must be a valid date" });
      }
      publishedAt = new Date(timestamp).toISOString();
    }

    const storyId = await storiesService.getOrCreateStory(
      title,
      CAMPUS_PULSE_CATEGORY,
      mainImage,
    );
    if (!storyId) {
      return res.status(500).json({ error: "Unable to create story" });
    }

    const article = await adminService.createManualArticle(
      req.admin.adminId,
      storyId,
      title,
      description,
      url,
      sourceName,
      imageUrl,
      publishedAt,
    );

    if (!article) {
      return res
        .status(409)
        .json({ error: "Unable to publish news. URL may already exist." });
    }

    await storiesService.updateStorySourcesCount(storyId);
    await invalidateNewsCache(storyId, article.id);

    return res.status(201).json({
      message: "News published successfully",
      category: CAMPUS_PULSE_CATEGORY,
      storyId,
      article,
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

async function getMyPublishedNews(req, res) {
  try {
    const limit = toPositiveInt(req.query.limit, 20);
    const offset = toNonNegativeInt(req.query.offset, 0);

    const articles = await adminService.getAdminPublishedArticles(
      req.admin.adminId,
      limit,
      offset,
    );

    return res.json(articles);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  adminLogin,
  getAdminMe,
  publishAdminNews,
  getMyPublishedNews,
};
