const express = require("express");
const {
  adminLogin,
  getAdminMe,
  publishAdminNews,
  getMyPublishedNews,
} = require("../controllers/adminController");
const { requireAdminAuth } = require("../middleware/adminAuth");

const router = express.Router();

router.post("/login", adminLogin);
router.get("/me", requireAdminAuth, getAdminMe);
router.post("/news", requireAdminAuth, publishAdminNews);
router.get("/news", requireAdminAuth, getMyPublishedNews);

module.exports = router;