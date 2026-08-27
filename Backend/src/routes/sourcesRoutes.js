const express = require("express");
const {
  getSources,
  getSourceStories,
} = require("../controllers/sourcesController");

const router = express.Router();

router.get("/", getSources);
router.get("/:name/stories", getSourceStories);

module.exports = router;
