const {
  redis,
  REDIS_KEY_PREFIX,
} = require("../../config/redisClient");

function buildKey(key) {
  return `${REDIS_KEY_PREFIX}:${key}`;
}

async function getJSON(key) {
  if (!redis) return null;

  try {
    const value = await redis.get(buildKey(key));
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error("[Cache] getJSON error:", err.message);
    return null;
  }
}

async function setJSON(key, payload, ttlSec) {
  if (!redis) return false;

  try {
    const data = JSON.stringify(payload);
    if (ttlSec && Number(ttlSec) > 0) {
      await redis.set(buildKey(key), data, "EX", Number(ttlSec));
    } else {
      await redis.set(buildKey(key), data);
    }
    return true;
  } catch (err) {
    console.error("[Cache] setJSON error:", err.message);
    return false;
  }
}

async function deleteByPattern(pattern) {
  if (!redis) return 0;

  let cursor = "0";
  let deleted = 0;
  const fullPattern = buildKey(pattern);

  try {
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        fullPattern,
        "COUNT",
        200,
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        deleted += await redis.del(...keys);
      }
    } while (cursor !== "0");

    return deleted;
  } catch (err) {
    console.error("[Cache] deleteByPattern error:", err.message);
    return 0;
  }
}

module.exports = {
  getJSON,
  setJSON,
  deleteByPattern,
};
