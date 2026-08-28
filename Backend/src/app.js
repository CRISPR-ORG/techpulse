const express = require("express");
const cors = require("cors");
require("dotenv").config();

const apiRoutes = require("./routes");

/**
 * The Express application, with no server attached.
 *
 * Kept separate from `server.js` so the same app can be driven two ways:
 *   - locally, by `server.js`, which calls `listen()` and starts the cron jobs;
 *   - on Vercel, by `api/index.js`, which hands each request to a serverless
 *     function. Nothing may listen on a port or start a timer at import time
 *     there, because the process is created per request and frozen afterwards.
 */
const app = express();

/**
 * In production the frontend is served from the same Vercel domain as `/api`,
 * so requests are same-origin and need no CORS headers at all. CORS exists
 * purely for local development, where Vite runs on :5173 and the API on :3000.
 *
 * Set CORS_ORIGINS (comma-separated) to allow specific origins in production.
 * Auth travels in the Authorization header rather than cookies, so no
 * credentialed-origin handling is required.
 */
function buildCorsOptions() {
  const configured = String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.length > 0) {
    return { origin: configured };
  }

  if (process.env.NODE_ENV === "production") {
    // Same-origin on Vercel: reflect nothing, allow same-origin requests
    // (which browsers send without an Origin header for navigations, and
    // which do not require CORS headers for XHR to the same host).
    return { origin: false };
  }

  const devOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
  ];

  return { origin: devOrigins };
}

app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: "1mb" }));

app.use("/api", apiRoutes);

app.get("/api", (req, res) => {
  res.json({ message: "TechPulse API is running" });
});

// Only reached in local development; on Vercel the static frontend owns "/".
app.get("/", (req, res) => {
  res.json({ message: "TechPulse API is running" });
});

app.use((req, res) => {
  res.status(404).json({ error: `No API route for ${req.method} ${req.path}` });
});

module.exports = app;
