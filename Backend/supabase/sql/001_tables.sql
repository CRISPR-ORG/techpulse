-- 001_tables.sql
-- Core tables for TechPulse news aggregator

create extension if not exists pgcrypto;
create extension if not exists citext;

-- 1) Stories table
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null,
  main_image text,
  sources_count integer not null default 0 check (sources_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stories_category on public.stories (category);
create index if not exists idx_stories_created_at_desc on public.stories (created_at desc);
create index if not exists idx_stories_sources_count_desc on public.stories (sources_count desc);

-- 2) Sources table
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name citext not null unique,
  website_url text,
  rss_url text unique,
  logo_url text,
  created_at timestamptz not null default now()
);

-- 3) Articles table
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  title text not null,
  description text,
  url text not null unique,
  source_name text not null,
  image_url text,
  published_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_articles_story_id on public.articles (story_id);
create index if not exists idx_articles_published_at_desc on public.articles (published_at desc);
create index if not exists idx_articles_source_name on public.articles (source_name);

-- 4) Story clicks table
create table if not exists public.story_clicks (
  id bigserial primary key,
  story_id uuid not null references public.stories(id) on delete cascade,
  clicked_at timestamptz not null default now()
);

create index if not exists idx_story_clicks_story_id on public.story_clicks (story_id);
create index if not exists idx_story_clicks_clicked_at_desc on public.story_clicks (clicked_at desc);
create index if not exists idx_story_clicks_story_time on public.story_clicks (story_id, clicked_at desc);
