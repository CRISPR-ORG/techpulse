/**
 * Runtime environment detection.
 *
 * Vercel runs each request in a serverless function whose filesystem is
 * read-only apart from `/tmp`, and `/tmp` is per-instance and discarded when
 * the instance is recycled. Anything that writes a cache or a data snapshot to
 * disk therefore has to become a no-op there: the write either throws (EROFS)
 * or silently produces a file that the next invocation cannot see.
 *
 * Redis is the durable cache in that environment, and Supabase is the durable
 * store. Both are network services, so both survive between invocations.
 */

const isServerless = Boolean(
  process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NOW_REGION,
);

/**
 * True when it is safe to persist to the local filesystem.
 * Set DISABLE_DISK_CACHE=true to force it off anywhere.
 */
function canUseDiskCache() {
  if (process.env.DISABLE_DISK_CACHE === "true") return false;
  return !isServerless;
}

module.exports = {
  isServerless,
  canUseDiskCache,
};
