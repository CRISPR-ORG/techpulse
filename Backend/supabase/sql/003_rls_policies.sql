-- 003_rls_policies.sql
-- Row Level Security policies
-- Assumes writes are done by backend using service role key

alter table public.stories enable row level security;
alter table public.articles enable row level security;
alter table public.sources enable row level security;
alter table public.story_clicks enable row level security;

-- Drop existing policies safely

drop policy if exists stories_read_all on public.stories;
drop policy if exists articles_read_all on public.articles;
drop policy if exists sources_read_all on public.sources;
drop policy if exists story_clicks_read_all on public.story_clicks;

-- Public read policies
create policy stories_read_all
on public.stories
for select
using (true);

create policy articles_read_all
on public.articles
for select
using (true);

create policy sources_read_all
on public.sources
for select
using (true);

create policy story_clicks_read_all
on public.story_clicks
for select
using (true);
