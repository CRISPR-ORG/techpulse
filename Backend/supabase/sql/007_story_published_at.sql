-- 007_story_published_at.sql
-- Adds a publication timestamp to stories so the news feed can paginate
-- directly in the database.
--
-- The feed shows each story's article publication time, but stories only had
-- `created_at` (ingest time). Ordering by ingest time put stories in the wrong
-- order, and correcting it in JS meant scanning a capped window of rows on
-- every request, which put a hard ceiling on how much news could be browsed.
-- With this column the feed is a plain indexed ORDER BY ... LIMIT ... OFFSET.

alter table public.stories
add column if not exists published_at timestamptz;

-- Backfill from each story's newest article, falling back to ingest time.
update public.stories s
set published_at = coalesce(
  (select max(a.published_at) from public.articles a where a.story_id = s.id),
  s.created_at
)
where s.published_at is null;

alter table public.stories
alter column published_at set default now();

create index if not exists idx_stories_published_at_desc
on public.stories (published_at desc);

-- Feed queries filter category and order by published_at together.
create index if not exists idx_stories_category_published_at
on public.stories (category, published_at desc);
