# Admin Panel - Campus Pulse

## What Has Been Implemented

The backend now includes a full Admin Portal API for manual news publishing.

1. Admin login using test credentials (`testing` / `123`).
2. JWT-protected admin session endpoints.
3. Publish news endpoint for admin-authored news (always under Campus Pulse).
4. Endpoint to fetch only the logged-in admin's published news.
5. Public endpoint for all users to fetch Campus Pulse stories.
6. SQL migration to support username-based admin login and article-to-admin linking.

## Test Admin Credentials

- Username: `testing`
- Password: `123`

## Admin API Endpoints

Base path: `/api/admin`

### 1) Login Admin

- Method: `POST`
- URL: `/api/admin/login`
- Auth required: `No`
- Body:

```json
{
  "username": "testing",
  "password": "123"
}
```

- Success response:

```json
{
  "token": "<jwt-token>",
  "admin": {
    "id": "<uuid>",
    "username": "testing",
    "email": "testing@campuspulse.local",
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
3. News cache is invalidated automatically when admin publishes a new article.
