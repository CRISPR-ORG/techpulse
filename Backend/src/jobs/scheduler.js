const cron = require("node-cron");
const runWorker = require("./worker");
const { isSupabaseConfigured } = require("../config/supabaseClient");
const {
  refreshOpportunitiesCache,
} = require("../controllers/listingsController");

const EXA_DAILY_CRON = process.env.EXA_OPPORTUNITIES_CRON || "0 3 * * *";
const WORKER_CRON = process.env.WORKER_CRON || "*/20 * * * *";

cron.schedule(EXA_DAILY_CRON, async () => {
  console.log("[Scheduler] Triggering daily Exa opportunities refresh");
  await refreshOpportunitiesCache({ force: false });
});

console.log(`[Scheduler] Exa opportunities cron active: ${EXA_DAILY_CRON}`);

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
