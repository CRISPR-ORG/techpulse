-- 004_admin_auth_seed.sql
-- Admin table and demo admin seed
-- Demo login: admin@gmail.com / 12345678

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  password_hash text not null,
  full_name text,
  role text not null default 'admin' check (role in ('admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_users_email on public.admin_users (email);
create index if not exists idx_admin_users_is_active on public.admin_users (is_active);

-- Reuse updated_at trigger function from 002_functions_and_triggers.sql
-- This avoids DROP statements so Supabase does not flag the query as destructive.
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_admin_users_set_updated_at'
  ) then
    create trigger trg_admin_users_set_updated_at
    before update on public.admin_users
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

-- Seed demo admin user (idempotent)
insert into public.admin_users (email, password_hash, full_name, role, is_active)
values (
  'admin@gmail.com',
  extensions.crypt('12345678', extensions.gen_salt('bf')),
  'Demo Admin',
  'admin',
  true
)
on conflict (email)
do update set
  password_hash = extensions.crypt('12345678', extensions.gen_salt('bf')),
  full_name = excluded.full_name,
  role = excluded.role,
  is_active = true,
  updated_at = now();

-- Helper for credential check from backend RPC if needed
create or replace function public.verify_admin_login(p_email text, p_password text)
returns table (admin_id uuid, email citext, role text)
language sql
security definer
set search_path = public, extensions
as $$
  select a.id, a.email, a.role
  from public.admin_users a
  where a.email = p_email
    and a.is_active = true
    and a.password_hash = extensions.crypt(p_password, a.password_hash)
  limit 1;
$$;

alter table public.admin_users enable row level security;

-- No public select policy by default for admin users
-- Backend should use service role key for admin operations.
