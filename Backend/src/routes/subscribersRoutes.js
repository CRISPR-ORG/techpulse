const express = require("express");
const {
  subscribe,
  unsubscribe,
} = require("../controllers/subscribersController");

const router = express.Router();

router.post("/", subscribe);
router.get("/unsubscribe", unsubscribe);
router.post("/unsubscribe", unsubscribe);

module.exports = router;
