const express = require("express");
const { getArticleById } = require("../controllers/articlesController");

const router = express.Router();

router.get("/:id", getArticleById);

module.exports = router;
