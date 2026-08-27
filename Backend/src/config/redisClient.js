const Redis = require("ioredis");
require("dotenv").config();

const REDIS_ENABLED =
  process.env.REDIS_ENABLED === "true" ||
  (!!process.env.REDIS_URL && process.env.REDIS_ENABLED !== "false");
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX || "techpulse:v1";

let redis = null;

if (REDIS_ENABLED) {
  redis = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 2) return null;
      return 300;
    },
  });

  redis.on("connect", () => console.log("[Redis] Connected"));
  redis.on("error", (err) => console.error("[Redis]", err.message));

  redis.connect().catch((err) => {
    console.error("[Redis] Initial connect failed:", err.message);
  });
} else {
  console.log("[Redis] Disabled (set REDIS_ENABLED=true to enable caching)");
}

function isRedisReady() {
  return !!redis && (redis.status === "ready" || redis.status === "connect");
}

module.exports = {
  redis,
  isRedisReady,
  REDIS_KEY_PREFIX,
};
