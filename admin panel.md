# Admin Panel - Campus Pulse

Portal URL: **`/campus-admin`** (the old `/admin` path redirects there).

## What Has Been Implemented

The backend now includes a full Admin Portal API for manual news publishing.

1. Admin login using the Campus Pulse credentials below.
2. JWT-protected admin session endpoints.
3. Publish news endpoint for admin-authored news (always under Campus Pulse).
4. Endpoint to fetch only the logged-in admin's published news.
5. Public endpoint for all users to fetch Campus Pulse stories.
6. SQL migration to support username-based admin login and article-to-admin linking.

## Admin Credentials

- Username: `crisprisbest`
- Password: `1234`

These are read from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `Backend/.env`, with
the same values compiled in as defaults so the portal works on a fresh clone.
Change both to rotate the login.

Login works with or without Supabase: the backend checks the database first and
falls back to the env credentials. Migration `006_campus_admin_user.sql` seeds
the same account in Postgres for when the database is available.

## Admin API Endpoints

Base path: `/api/admin`

### 1) Login Admin

- Method: `POST`
- URL: `/api/admin/login`
- Auth required: `No`
- Body:

```json
{
  "username": "crisprisbest",
  "password": "1234"
}
```

- Success response:

```json
{
  "token": "<jwt-token>",
  "admin": {
    "id": "<uuid>",
    "username": "crisprisbest",
    "email": "crisprisbest@campuspulse.local",
    "role": "admin"
  }
}
```

### 2) Get Logged-In Admin Profile

- Method: `GET`
- URL: `/api/admin/me`
- Auth required: `Yes`
- Header:

```http
Authorization: Bearer <jwt-token>
```

### 3) Publish News (Admin)

- Method: `POST`
- URL: `/api/admin/news`
- Auth required: `Yes`
- Header:

```http
Authorization: Bearer <jwt-token>
```

- Body:

```json
{
  "title": "Campus Placement Drive 2026",
  "description": "Top companies visiting campus next week.",
  "url": "https://campuspulse.example/news/placement-drive-2026",
  "sourceName": "Campus Pulse Admin",
  "imageUrl": "https://example.com/image.jpg",
  "mainImage": "https://example.com/main-image.jpg",
  "publishedAt": "2026-04-13T10:30:00Z"
}
```

- Required fields: `title`, `description`, `url`
- Optional fields: `sourceName`, `imageUrl`, `mainImage`, `publishedAt`
- Category behavior: Always stored as `campus-pulse` so every admin post appears in the Campus Pulse section.

### 4) Get My Published News

- Method: `GET`
- URL: `/api/admin/news?limit=20&offset=0`
- Auth required: `Yes`
- Header:

```http
Authorization: Bearer <jwt-token>
```

### 5) Public Campus Pulse Stories (All Users)

- Method: `GET`
- URL: `/api/stories/campus-pulse?limit=20&offset=0`
- Auth required: `No`
- Purpose: Returns all stories under the Campus Pulse section, including admin-published stories.

## SQL Added for Admin Feature

A new migration file was added:

- `Backend/supabase/sql/005_admin_portal_testing_user.sql`

This migration does the following:

1. Adds `username` column to `admin_users`.
2. Adds unique constraint for `username`.
3. Adds `published_by_admin_id` column to `articles`.
4. Replaces `verify_admin_login` function to support username or email as identifier.
5. Seeds the test admin user `testing` with password `123`.

## SQL Execution Order

Run in this order inside Supabase SQL Editor:

1. `001_tables.sql`
2. `002_functions_and_triggers.sql`
3. `003_rls_policies.sql`
4. `004_admin_auth_seed.sql`
5. `005_admin_portal_testing_user.sql`
6. `006_campus_admin_user.sql`

The migrations are optional for the portal to function. While they are
unapplied, posts are stored in `Backend/.cache/local-store.json` instead.

## Backend Files Added/Updated

### Added

- `Backend/src/middleware/adminAuth.js`
- `Backend/src/controllers/adminController.js`
- `Backend/src/routes/adminRoutes.js`
- `Backend/supabase/sql/005_admin_portal_testing_user.sql`
- `admin panel.md`

### Updated

- `Backend/src/models/adminService.js`
- `Backend/src/routes/index.js`
- `Backend/supabase/sql/README.md`

## Notes

1. JWT secret uses `ADMIN_JWT_SECRET` if configured; otherwise a testing fallback secret is used.
2. For production, always set a strong `ADMIN_JWT_SECRET` in environment variables.
3. News cache is invalidated automatically when admin publishes a new article, so
   a published post shows up in Campus Hub on the next page load.
4. A publish that is rejected as a duplicate URL cleans up the story row it
   created, so Campus Pulse never shows a bulletin with no content behind it.
5. Admin posts are written to disk immediately and are never evicted by the
   news-feed cap, so they survive a backend restart.

---

# Daily Tech News Digest (7 AM email)

An automated email of the day's tech news, sent through Brevo, to everyone
who subscribed from the homepage plus the optional operator address.

## Schedule

- Runs at **07:00 Asia/Kolkata**, every day (`DIGEST_CRON`, `DIGEST_TIMEZONE`
  locally; on Vercel the schedule lives in `vercel.json`'s `crons` instead).
- Registered in `Backend/src/jobs/scheduler.js`; the job lives in
  `Backend/src/jobs/dailyDigest.js`.
- Locally, the backend process must be running for the cron to fire.

## Subscribing (homepage)

A "GET THE DAILY DIGEST" form on the homepage posts to `POST /api/subscribe`
with `{ "email": "you@iiitn.ac.in" }`. Only `@iiitn.ac.in` addresses are
accepted (enforced in `subscribersService.js`, mirrored in the homepage form)
— anything else is rejected with a 400. Accepted addresses are added as a
contact to
a Brevo list (`BREVO_DIGEST_LIST_ID`, default `3` — the "TechPulse" list in
the Brevo dashboard) via `Backend/src/models/subscribersService.js`. Brevo is
the source of truth for subscribers, not a local table. Re-subscribing
relinks an existing contact to the list. `POST /api/subscribe/unsubscribe`
(or `GET /api/subscribe/unsubscribe?email=...`) unlinks the contact from the
list without deleting it from Brevo.

Recipients for the 07:00 send are every contact currently on that list plus
`DIGEST_TO_EMAIL` (if set), deduplicated. Recipient addresses ride in `Bcc`
(with one address as the visible `To`) so they are never exposed to each
other. See `Backend/src/jobs/dailyDigest.js:getRecipients`.

## Required setup

Add your Brevo API key to `Backend/.env`:

```
BREVO_API_KEY=xkeysib-your_key_here
```

Get it from <https://app.brevo.com> → **SMTP & API** → **API Keys**. Without
it the job still builds the email, logs the story count, and skips the send
with a clear message — it does not crash.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `BREVO_API_KEY` | _(empty)_ | Brevo API key. Required to send and to manage subscribers. |
| `BREVO_DIGEST_LIST_ID` | `3` | Brevo contact list holding digest subscribers. |
| `DIGEST_TO_EMAIL` | `bt25csh002@iiitn.ac.in` | Optional operator address, always included alongside subscribers. Comma-separate for several. |
| `DIGEST_FROM_EMAIL` | `TechPulse <no-reply@techpulse.dev>` | Sender. Must be a sender verified in Brevo. |
| `DIGEST_CRON` | `0 7 * * *` | Cron expression (local `node-cron` only). |
| `DIGEST_TIMEZONE` | `Asia/Kolkata` | Timezone the local cron is evaluated in. |
| `DIGEST_ENABLED` | `true` | Set `false` to turn the job off. |
| `DIGEST_SITE_URL` | _(empty)_ | Optional "open the full feed" link. |

## Sender verification — required to send at all

Brevo rejects a send from a `DIGEST_FROM_EMAIL` address that isn't verified on
the account. The backend warns about this at startup if `DIGEST_FROM_EMAIL`
is unset, so the problem is visible immediately rather than as a missing
email at 07:00.

### Verifying a sender (one-time)

1. Open <https://app.brevo.com> → **Senders, Domains & Dedicated IPs** →
   **Senders** tab → **Add a sender**.
2. Enter the from-address you want to use (e.g. `digest@yourdomain.com`) and
   confirm via the verification email Brevo sends to it — a quick way to
   start is verifying an address you already control (e.g. your own inbox);
   verifying a domain instead (**Domains** tab, add DKIM/SPF DNS records)
   lets you send from any address on it.
3. Once verified, edit `Backend/.env`:

   ```
   DIGEST_FROM_EMAIL=TechPulse <digest@yourdomain.com>
   ```

4. **Restart the backend.** `.env` is read once at startup, so a change has
   no effect until the process restarts.
5. Confirm with a real send:

   ```
   POST /api/admin/digest/send
   Authorization: Bearer <admin-jwt>
   ```

   A `200` with an `emailId` means it delivered.

### Free tier

300 emails/day — far beyond one digest to a campus mailing list.

## Contents

The email carries the **top 25 stories of the day**, not the newest 25.

- The window is stories published **today** in the configured timezone. If
  fewer than 5 exist so far, it widens to the last 24 hours; the email says
  which window it used.
- Every story in the window is scored, then the top 25 are shown newest-first.
  Scoring combines:
  - **Freshness** — halves roughly every 8 hours, so the morning's news leads.
  - **Source weight** — a wire report outranks a personal blog post. Community
    feeds (Dev.to, Reddit, HN Ask/Show) are deliberately down-weighted so a
    changelog cannot top the email.
  - **Corroboration** — how many *distinct* outlets carried the same headline.
    Repeats from a single source do not count; that is repetition, not
    significance. Shown in the email as "+N more outlets".
- Entries without a real source link are skipped.
- Sent as HTML plus a plain-text alternative.

## News sources

`Backend/src/services/sources/rssSources.js` holds ~60 verified feeds across
general tech press, mainstream technology desks, developer and engineering
blogs, AI research, cloud, security, consumer hardware, and India tech. A
typical run pulls ~1,270 articles in about 6 seconds.

Each entry supports:

- `trusted: true` — the feed is entirely tech, so items skip keyword filtering.
  Without it, tech coverage that avoids obvious keywords gets dropped.
- `maxItems` — caps how much of a feed is taken per run. Some feeds return
  their whole archive (OpenAI's returns >1000 entries).

Feeds returning 403/404/406/410 were removed rather than left failing on every
run. Reddit's RSS answers 429 to server traffic almost every time, so only one
low-volume subreddit is included and it is expected to fail intermittently.

To add a source, append it to that file and restart. Verify it parses first —
a dead feed costs a request every run and returns nothing.

## Testing without waiting for 7 AM

Preview the rendered email without sending:

```
POST /api/admin/digest/send?dryRun=true
Authorization: Bearer <admin-jwt>
```

Send it for real:

```
POST /api/admin/digest/send
Authorization: Bearer <admin-jwt>
```

Both require admin auth.

---

# Open Source Page

Live GitHub data at `/opensource`, served from `/api/github-opportunities`.

## What it shows

Two tabs:

1. **Good first issues** — unassigned beginner issues across JavaScript,
   TypeScript, Python, Go, Rust and Java, filterable by language.
2. **Trending repos** — repositories with >1,000 stars pushed in the last week,
   with stars, forks, open-issue counts and topics.

Issues are filtered with `comments:<5`, `no:assignee` and `created:>` the last
60 days. The usual problem with "good first issue" lists is that the top
results are months old and already claimed; these constraints keep the list to
issues actually open for work. Languages are interleaved so one ecosystem does
not fill the page.

## Credentials

None required. `GITHUB_TOKEN` in `Backend/.env` is optional and only raises the
rate limit.

| | Search requests |
| --- | --- |
| Unauthenticated | 10 / hour |
| With `GITHUB_TOKEN` | 30 / minute |

One refresh spends 7 search requests, and results are cached for 24 hours, so
the unauthenticated budget is sufficient.

To add a token: create a GitHub personal access token with **no scopes**
(public data only) at https://github.com/settings/tokens and set
`GITHUB_TOKEN=` in `Backend/.env`.

## Caching and failure behaviour

- Cached in Redis for 24 hours, and mirrored to
  `Backend/.cache/github-opensource-daily.json`.
- After a Redis flush or restart the snapshot is warmed from disk rather than
  re-querying GitHub.
- If GitHub is rate limited or unreachable, the last good snapshot is served.
- With no snapshot at all, the endpoint returns 503 with an actionable message
  instead of an empty page.

## Note

The previous implementation always sent `Authorization: token ${GITHUB_TOKEN}`.
With no token configured that header read `token undefined`, which GitHub
rejects with 401 — so the page showed "Failed to fetch" rather than falling
back to unauthenticated access. The header is now only sent when a token exists.
