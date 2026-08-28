const app = require("../Backend/src/app");

/**
 * Vercel serverless entry point for the whole Express API.
 *
 * `vercel.json` rewrites every `/api/*` request to this single function, so
 * one Node function serves all routes rather than one function per endpoint.
 * That keeps the existing Express router intact and avoids a cold start per
 * route.
 *
 * Vercel preserves the original request URL through a rewrite, so Express
 * normally sees `/api/stories` and matches its `/api` mount. The guard below
 * covers the case where the platform hands over a path with the `/api` prefix
 * already stripped — without it every route would 404 in production while
 * working locally.
 */
module.exports = (req, res) => {
  if (!req.url.startsWith("/api")) {
    req.url = req.url === "/" ? "/api" : `/api${req.url}`;
  }

  return app(req, res);
};
