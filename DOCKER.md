# Running TechPulse in Docker

TechPulse is a campus tech-news/opportunities/community site with an Express API and a React frontend. This document covers running the whole thing as a single containerized service — one process serves both the site and the API, so it can be reverse-proxied under a path or subdomain on another site (e.g. `crispr.iiitn.ac.in/techpulse` or `techpulse.crispr...`).

## What's in the image

- The built React frontend (static files)
- The Express API, mounted under `/api/*`
- An in-process scheduler for two recurring jobs: a news-ingest worker and a daily 7 AM email digest (see **Cron jobs**, below — important if TechPulse is also running elsewhere)

One process, one port (`3000` by default), no separate frontend/backend deployment needed.

## Prerequisites

- Docker (and optionally Docker Compose)
- A copy of this repository
- A filled-in `Backend/.env` — copy `Backend/.env.example` and fill in values (see **Environment variables** below)

## Build & run

**Plain Docker:**

```bash
docker build -t techpulse:latest .
docker run -d --name techpulse -p 3000:3000 --env-file Backend/.env techpulse:latest
```

**Docker Compose** (equivalent, easier to manage):

```bash
docker compose up -d --build
```

Either way, the site is then live at `http://localhost:3000/` and the API at `http://localhost:3000/api/*`.

Health check: `GET /api` → `{"message":"TechPulse API is running"}`. The image also defines a `HEALTHCHECK` that Docker/Compose/orchestrators can use automatically.

## Environment variables

Full reference with comments: `Backend/.env.example`. The ones that matter most for a production deployment:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Database. Without these the app runs on an in-memory/on-disk fallback store — fine for a demo, not for real persistence. |
| `BREVO_API_KEY` | Powers the daily digest email and the homepage subscribe form. |
| `BREVO_DIGEST_LIST_ID` | Brevo contact list that holds digest subscribers (defaults to `3`). |
| `DIGEST_FROM_EMAIL` | Must be a sender verified in Brevo (Senders, Domains & Dedicated IPs), or sends are rejected. |
| `DIGEST_TO_EMAIL` | Optional operator address that always gets the digest alongside subscribers. |
| `CORS_ORIGINS` | Only needed if the API is called cross-origin (e.g. from a different domain than where the frontend is served). Same-origin deployments (recommended — see below) don't need this. |
| `PORT` | Defaults to `3000`; matches `EXPOSE 3000` in the image. |
| `ENABLE_LOCAL_CRON` | Set to `false` to disable the in-process scheduler entirely (see **Cron jobs** below). |

Everything else (`NEWS_API_KEY`, `REDIS_*`, `ADMIN_*`, `GITHUB_TOKEN`, `EXA_API_KEY`) is optional — the app degrades gracefully without them.

## Reverse-proxying under an existing site (nginx example)

Since the container serves both the frontend and the API from one origin, the simplest integration is a reverse proxy that forwards a path or subdomain straight to it — no path-rewriting needed:

```nginx
# Subdomain, e.g. techpulse.example.com
server {
    server_name techpulse.example.com;
    location / {
        proxy_pass http://techpulse:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

If it needs to live under a subpath of an existing domain instead (e.g. `example.com/techpulse`), that's more involved — the React app's routing and asset paths assume it's served from `/`. Talk to us before doing that; a subdomain is much simpler and is what we'd recommend.

## ⚠️ Cron jobs — read before deploying this alongside our existing hosting

TechPulse is also deployed on Vercel, where the same two jobs (news ingest + the 7 AM digest) run via Vercel Cron. **If this container runs at the same time as that deployment with the digest enabled in both places, subscribers will get the daily email twice.**

Before deploying this container in parallel with our existing hosting, decide which deployment owns the scheduled jobs, and disable them on the other one:

- To disable both jobs in this container: set `ENABLE_LOCAL_CRON=false` in its environment.
- To disable just the digest: set `DIGEST_ENABLED=false`.

Ping us (whoever manages the TechPulse repo) before flipping the switch on which deployment is authoritative, since it affects real subscribers.

## Notes

- The image is a multi-stage build: the frontend is compiled in a builder stage, and only the built static files + backend source ship in the final image (no dev dependencies, no source maps' worth of extra tooling).
- Without Supabase configured, admin-published content and other data live only inside the container's filesystem (`Backend/.cache/`) and are lost if the container is recreated. Mount a volume at `/app/Backend/.cache` if you need that to survive restarts without Supabase, or (better) just configure Supabase.
- Source: [repository link — ask for access if you don't have it]
