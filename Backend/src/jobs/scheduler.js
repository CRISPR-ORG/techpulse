const cron = require("node-cron");
const runWorker = require("./worker");
const { isSupabaseConfigured } = require("../config/supabaseClient");
const {
  refreshOpportunitiesCache,
} = require("../controllers/listingsController");
const { runDailyDigest } = require("./dailyDigest");
const { checkDeliveryConfig } = require("../services/email/mailer");

const OPPORTUNITIES_CRON =
  process.env.OPPORTUNITIES_CRON || process.env.EXA_OPPORTUNITIES_CRON || "0 3 * * *";
const WORKER_CRON = process.env.WORKER_CRON || "*/20 * * * *";

// 07:00 every day, in the recipient's timezone rather than the server's.
const DIGEST_CRON = process.env.DIGEST_CRON || "0 7 * * *";
const DIGEST_TIMEZONE = process.env.DIGEST_TIMEZONE || "Asia/Kolkata";
const DIGEST_ENABLED = process.env.DIGEST_ENABLED !== "false";

cron.schedule(OPPORTUNITIES_CRON, async () => {
  console.log("[Scheduler] Triggering daily tech job opportunities refresh");
  await refreshOpportunitiesCache({ force: true });
});

console.log(
  `[Scheduler] Opportunities cron active: ${OPPORTUNITIES_CRON}`,
);

// Warm the opportunities snapshot on boot so the first visitor is not the one
// waiting on five job boards.
refreshOpportunitiesCache({ force: false }).catch((err) =>
  console.error("[Scheduler] Initial opportunities warmup failed:", err.message || err),
);

if (DIGEST_ENABLED) {
  cron.schedule(
    DIGEST_CRON,
    async () => {
      console.log("[Scheduler] Triggering daily tech news digest email");
      await runDailyDigest();
    },
    { timezone: DIGEST_TIMEZONE },
  );

  console.log(
    `[Scheduler] Daily digest cron active: ${DIGEST_CRON} (${DIGEST_TIMEZONE})`,
  );

  // Surface delivery problems now rather than as a silent 07:00 failure.
  for (const problem of checkDeliveryConfig()) {
    console.warn(`[Scheduler] Digest warning: ${problem}`);
  }
} else {
  console.log("[Scheduler] Daily digest disabled (DIGEST_ENABLED=false).");
}

if (!isSupabaseConfigured) {
  console.log("[Scheduler] Disabled because Supabase is not configured.");
} else {
  cron.schedule(WORKER_CRON, async () => {
    console.log("Triggering back worker");
    await runWorker();
  });

  console.log(`[Scheduler] Worker cron active: ${WORKER_CRON}`);

  runWorker();
}
