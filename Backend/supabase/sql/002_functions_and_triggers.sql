-- 002_functions_and_triggers.sql
-- Utility functions and triggers for story metadata

-- Keep updated_at fresh on updates
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_stories_set_updated_at on public.stories;
create trigger trg_stories_set_updated_at
before update on public.stories
for each row
execute function public.set_updated_at();

-- Slugify helper for SEO URLs
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- Auto-generate unique slug if missing
create or replace function public.ensure_story_slug()
returns trigger
language plpgsql
as $$
declare
  base_slug text;
  candidate text;
  suffix integer := 1;
begin
  if new.slug is null or length(trim(new.slug)) = 0 then
    base_slug := public.slugify(new.title);

    if base_slug is null or length(base_slug) = 0 then
      base_slug := 'story';
    end if;

    candidate := base_slug;

    while exists (
      select 1
      from public.stories s
      where s.slug = candidate
        and s.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) loop
      suffix := suffix + 1;
      candidate := base_slug || '-' || suffix::text;
    end loop;

    new.slug := candidate;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_stories_ensure_slug on public.stories;
create trigger trg_stories_ensure_slug
before insert or update of title, slug on public.stories
for each row
execute function public.ensure_story_slug();

-- Helper to recalculate sources_count for a story
create or replace function public.refresh_story_sources_count(target_story_id uuid)
returns void
language sql
as $$
  update public.stories s
  set sources_count = (
    select count(distinct a.source_name)
    from public.articles a
    where a.story_id = target_story_id
  )
  where s.id = target_story_id;
$$;
