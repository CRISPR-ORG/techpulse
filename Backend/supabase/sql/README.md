Supabase SQL execution order:

1. 001_tables.sql
2. 002_functions_and_triggers.sql
3. 003_rls_policies.sql
4. 004_admin_auth_seed.sql
5. 005_admin_portal_testing_user.sql
6. 006_campus_admin_user.sql
7. 007_story_published_at.sql

How to run:
- Open Supabase Dashboard -> SQL Editor.
- Run each file in the order above.
- Confirm all statements succeed before moving to the next file.

Note:
- Until these migrations are applied, the backend runs on the on-disk local
  store in `Backend/.cache/local-store.json`. The site works either way, but
  applying them moves Campus Pulse posts into Postgres.
- Verify with: `curl http://localhost:3000/api/stories/campus-pulse`
