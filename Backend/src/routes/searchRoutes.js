const express = require("express");
const { searchStories } = require("../controllers/searchController");

const router = express.Router();

router.get("/", searchStories);

module.exports = router;
