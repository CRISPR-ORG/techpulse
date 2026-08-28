const express = require("express");
const crypto = require("crypto");
const runWorker = require("../jobs/worker");
const { runDailyDigest } = require("../jobs/dailyDigest");
const {
  refreshOpportunitiesCache,
} = require("../controllers/listingsController");

const router = express.Router();

/**
 * HTTP entry points for the scheduled jobs.
 *
 * Locally these same jobs run from `src/jobs/scheduler.js` via node-cron.
 * On Vercel there is no long-lived process to hold a timer, so Vercel Cron
 * calls these endpoints instead (see `vercel.json`).
 */

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * These endpoints trigger real work (and can send email), so they must not be
 * publicly callable. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 *
 * If CRON_SECRET is unset the endpoints refuse to run rather than defaulting
 * to open — an unprotected trigger would let anyone spend the GitHub rate
 * limit or fire the digest repeatedly.
 */
function requireCronAuth(req, res, next) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return res.status(503).json({
      error:
        "CRON_SECRET is not configured. Set it in the environment to enable scheduled jobs.",
    });
  }

  const header = String(req.headers.authorization || "");
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!provided || !timingSafeEqual(provided, secret)) {
    return res.status(401).json({ error: "Invalid cron credentials" });
  }

  return next();
}

function handle(name, task) {
  return async (req, res) => {
    const startedAt = Date.now();
    console.log(`[Cron] ${name} started`);

    try {
      const result = await task(req);
      const ms = Date.now() - startedAt;

      console.log(`[Cron] ${name} finished in ${ms}ms`);
      return res.json({ job: name, ok: true, durationMs: ms, result });
    } catch (err) {
      const message = err?.message || String(err);
      console.error(`[Cron] ${name} failed:`, message);
      return res.status(500).json({ job: name, ok: false, error: message });
    }
  };
}

router.use(requireCronAuth);

// Fetch every RSS/News source and persist new articles.
router.all(
  "/ingest",
  handle("ingest", async () => {
    await runWorker();
    return { message: "ingest complete" };
  }),
);

// Refresh the cached tech-job listings.
router.all(
  "/opportunities",
  handle("opportunities", async () => {
    const items = await refreshOpportunitiesCache({ force: true });
    return { opportunities: Array.isArray(items) ? items.length : 0 };
  }),
);

// Build and send the daily digest email.
router.all(
  "/digest",
  handle("digest", async (req) => {
    const dryRun = String(req.query.dryRun || "") === "true";
    const result = await runDailyDigest({ dryRun });

    if (!result.ok && !dryRun) {
      throw new Error(result.error || "Digest send failed");
    }

    return {
      stories: result.count ?? 0,
      subject: result.subject || null,
      emailId: result.id || null,
      dryRun,
    };
  }),
);

module.exports = router;
