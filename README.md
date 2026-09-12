# TechPulse

Campus tech news, opportunities, and community hub — a live feed of tech news aggregated from ~60 sources, campus-specific announcements, hackathons/internships, and a daily 7 AM email digest, all served from a single Vercel deployment.

## Features

- **Tech News Feed** (`/news`) — deduplicated, ranked stories aggregated from ~60 RSS feeds and NewsAPI, refreshed every 20 minutes.
- **Campus Pulse** (`/campus-pulse`) — admin-published campus announcements and updates.
- **Opportunities** (`/opportunities`) — tech jobs and internships pulled from several keyless job boards, refreshed daily.
- **Open Source** (`/opensource`, feature-flagged) — live GitHub data: good-first-issues and trending repos.
- **Fests & Clubs** (`/fests`, `/clubs`) — campus event and club listings.
- **Daily Email Digest** — an automated 7:00 AM email of the day's top 25 tech stories, sent via [Brevo](https://www.brevo.com). Visitors subscribe from the homepage with an `@iiitn.ac.in` address; subscribers are managed as contacts on a Brevo list (Brevo is the source of truth, not a local table).
- **Admin Portal** (`/campus-admin`) — JWT-authenticated portal for publishing Campus Pulse posts and triggering the digest on demand.

See [`admin panel.md`](./admin%20panel.md) for detailed documentation of the admin portal and the daily digest job (schedule, Brevo setup, subscriber flow, troubleshooting).

## Tech stack

- **Frontend**: React 19 + Vite, React Router
- **Backend**: Express 5, running as a single Vercel serverless function (`api/index.js`)
- **Database**: Supabase (Postgres), with an in-memory/on-disk fallback store when Supabase isn't configured
- **Cache**: Redis (optional — used for API response caching)
- **Email**: Brevo transactional email API + contact lists
- **Scheduled jobs**: Vercel Cron (production) / `node-cron` (local dev)

## Project structure

```
├── Backend/                 # Express API
│   ├── src/
│   │   ├── routes/          # Route definitions, mounted under /api
│   │   ├── controllers/     # Request handlers
│   │   ├── models/          # Data access (Supabase + fallback store)
│   │   ├── services/        # Fetchers, email, cache, source config
│   │   └── jobs/            # Worker (news ingest) and daily digest
├── frontend/                # React + Vite app
│   └── src/
│       ├── pages/           # One file per route
│       ├── components/      # Shared UI (navbar, ticker, footer, etc.)
│       └── services/        # apiClient.js — all backend calls
├── api/index.js             # Vercel serverless entry point (wraps the Express app)
├── architecture/            # System architecture diagrams (SVG)
└── vercel.json              # Rewrites + cron schedules for production
```

## Getting started

Requires Node 22.x.

```bash
npm install
```

Copy the environment template and fill in your own values:

```bash
cp Backend/.env.example Backend/.env
```

At minimum you'll need a Supabase project (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) and a Brevo API key (`BREVO_API_KEY`) to enable the digest email — see `Backend/.env.example` for the full list and what's optional. Without Supabase configured, the backend runs on a local on-disk store so the site still works for development.

Then, in separate terminals:

```bash
npm run dev:api   # Express API on :3000
npm run dev:web   # Vite dev server on :5173
```

The frontend proxies `/api` requests to the local backend during development.

## Deployment

This repo deploys as a **single Vercel project**: the React app builds to static files, and the entire Express API runs behind one serverless function at `/api/*` (see `vercel.json`'s rewrites). Two scheduled jobs run via Vercel Cron:

| Job | Schedule (UTC) | Purpose |
| --- | --- | --- |
| `/api/cron/ingest` | `0 1 * * *` | Refresh the news feed from all sources |
| `/api/cron/digest` | `30 1 * * *` | Send the daily 7:00 AM IST email digest |

Environment variables must be set separately in the Vercel dashboard (Project → Settings → Environment Variables) — `Backend/.env` is never deployed. Note: on Vercel's Hobby plan, Cron Jobs fire within a **1-hour flexible window** of the scheduled time, not the exact minute.

### Running as a standalone container

TechPulse can also run as a single self-contained Docker image (frontend + API + scheduled jobs all in one process) — see [`DOCKER.md`](./DOCKER.md) for build/run instructions and important notes on not double-running the scheduled jobs if this is deployed alongside the Vercel hosting above.

## License

No license specified — all rights reserved by the repository owner.
