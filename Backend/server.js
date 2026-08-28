require("dotenv").config();

const app = require("./src/app");

/**
 * Local development server.
 *
 * This file is the entry point for `npm run dev` / `npm start` only. Vercel
 * never runs it — there, `api/index.js` imports `src/app.js` directly and
 * Vercel owns the HTTP server.
 *
 * The in-process cron scheduler is started here rather than in `app.js`
 * because serverless functions are created per request and frozen between
 * them, so a timer registered at import time would never fire reliably. On
 * Vercel the same jobs run through Vercel Cron hitting `/api/cron/*`.
 */
if (process.env.ENABLE_LOCAL_CRON !== "false") {
  require("./src/jobs/scheduler");
} else {
  console.log("[Server] Local cron scheduler disabled (ENABLE_LOCAL_CRON=false)");
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
