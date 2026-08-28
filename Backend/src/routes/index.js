const express = require("express");
const storiesRoutes = require("./storiesRoutes");
const sourcesRoutes = require("./sourcesRoutes");
const articlesRoutes = require("./articlesRoutes");
const searchRoutes = require("./searchRoutes");
const githubRoutes = require("./githubRoutes");
const adminRoutes = require("./adminRoutes");
const listingsRoutes = require("./listingsRoutes");
const cronRoutes = require("./cronRoutes");

const router = express.Router();

router.use("/stories", storiesRoutes);
router.use("/sources", sourcesRoutes);
router.use("/articles", articlesRoutes);
router.use("/search", searchRoutes);
router.use("/github-opportunities", githubRoutes);
router.use("/admin", adminRoutes);
router.use("/listings", listingsRoutes);
router.use("/cron", cronRoutes);

module.exports = router;
