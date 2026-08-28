const express = require("express");
const {
  getStories,
  getStoriesCount,
  getTrendingStories,
  getStoriesByCategory,
  getCampusPulseStories,
  getStoryArticles,
  getStoryById,
} = require("../controllers/storiesController");

const router = express.Router();

router.get("/", getStories);
router.get("/count", getStoriesCount);
router.get("/trending", getTrendingStories);
router.get("/campus-pulse", getCampusPulseStories);
router.get("/category/:category", getStoriesByCategory);
router.get("/:id/articles", getStoryArticles);
router.get("/:id", getStoryById);

module.exports = router;
