-- 005_admin_portal_testing_user.sql
-- Admin portal updates for username login and admin-authored news publishing
-- Test login: testing / 123

create extension if not exists pgcrypto;
create extension if not exists citext;

-- 1) Add username support for admin login
alter table public.admin_users
add column if not exists username citext;

update public.admin_users
set username = split_part(email::text, '@', 1)
where username is null
  and email is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_users_username_key'
  ) then
    alter table public.admin_users
    add constraint admin_users_username_key unique (username);
  end if;
end;
$$;

-- 2) Track which admin published a manual article
alter table public.articles
add column if not exists published_by_admin_id uuid references public.admin_users(id) on delete set null;

create index if not exists idx_articles_published_by_admin_id
on public.articles (published_by_admin_id);

-- 3) Replace login RPC with username/email identifier support
drop function if exists public.verify_admin_login(text, text);

create or replace function public.verify_admin_login(p_identifier text, p_password text)
returns table (admin_id uuid, username citext, email citext, role text)
language sql
security definer
set search_path = public, extensions
as $$
  select a.id, a.username, a.email, a.role
  from public.admin_users a
  where (
      a.username = p_identifier
      or a.email::text = p_identifier
    )
    and a.is_active = true
    and a.password_hash = extensions.crypt(p_password, a.password_hash)
  limit 1;
$$;

-- 4) Seed testing admin user (idempotent)
insert into public.admin_users (username, email, password_hash, full_name, role, is_active)
values (
  'testing',
  'testing@campuspulse.local',
  extensions.crypt('123', extensions.gen_salt('bf')),
  'Testing Admin',
  'admin',
  true
)
on conflict (email)
do update set
  username = excluded.username,
  password_hash = extensions.crypt('123', extensions.gen_salt('bf')),
  full_name = excluded.full_name,
  role = excluded.role,
  is_active = true,
  updated_at = now();
