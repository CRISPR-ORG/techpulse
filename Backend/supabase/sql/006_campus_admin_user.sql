-- 006_campus_admin_user.sql
-- Seeds the Campus Pulse admin account used by the /campus-admin portal.
-- Login: crisprisbest / the password in ADMIN_PASSWORD (Backend/.env).
-- Keep the literal below in sync with that value, otherwise re-running this
-- file resets the database password away from what the app is configured with.
--
-- The backend also accepts these credentials from ADMIN_USERNAME /
-- ADMIN_PASSWORD, so the portal works before this migration is applied.
-- Running it makes posts persist in Supabase instead of the local store.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- The fixed id matches ENV_ADMIN_ID in src/models/adminService.js, so posts
-- published before this migration keep the same owner afterwards.
insert into public.admin_users (
  id,
  username,
  email,
  password_hash,
  full_name,
  role,
  is_active
)
values (
  'a0000000-0000-4000-8000-000000000001',
  'crisprisbest',
  'crisprisbest@campuspulse.local',
  extensions.crypt('1234', extensions.gen_salt('bf')),
  'Campus Pulse Admin',
  'admin',
  true
)
on conflict (id)
do update set
  username = excluded.username,
  email = excluded.email,
  password_hash = extensions.crypt('1234', extensions.gen_salt('bf')),
  full_name = excluded.full_name,
  role = excluded.role,
  is_active = true,
  updated_at = now();
