const express = require("express");
const {
  getHackathons,
  getOpportunities,
} = require("../controllers/listingsController");

const router = express.Router();

router.get("/hackathons", getHackathons);
router.get("/opportunities", getOpportunities);

module.exports = router;
