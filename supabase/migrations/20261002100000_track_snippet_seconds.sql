-- The audio snippet's length in seconds, measured in the browser when it's
-- uploaded (by decoding the audio, which is exact). Players can't always tell
-- from the file: a browser's recorder, for example, can write an M4A whose track
-- header says 0.146 s for a 7 s clip, and Firefox then shows 0:00. The admin form
-- and (Phase 3) the song article's player read this instead. Older rows have no
-- value; they fall back to what the player reports.

alter table public.tracks
  add column snippet_seconds numeric(5, 2)
    check (snippet_seconds is null or (snippet_seconds > 0 and snippet_seconds <= 31)),
  add constraint tracks_snippet_seconds_need_snippet
    check (snippet_seconds is null or snippet_path is not null);

comment on column public.tracks.snippet_seconds is
  'Snippet length in seconds, decoded in the browser at upload (null for older rows).';

-- The song article's "about this" panel gets the length too. Same view as in
-- 20260930130000_content_views.sql, with snippet_seconds added to the tracks details.
create or replace view public.post_items
with (security_invoker = true)
as
select 'projects'::text as section, p.post_id, p.id as item_id, p.title, p.image_path, p.image_alt,
       jsonb_build_object('url', p.url, 'repo_url', p.repo_url, 'stack', p.stack) as details
from public.projects p
where p.status = 'published' and p.post_id is not null

union all
select 'books', b.post_id, b.id, b.title, b.image_path, b.image_alt,
       jsonb_build_object('author', b.author, 'reading_status', b.reading_status, 'rating', b.rating,
                          'published_year', b.published_year, 'page_count', b.page_count)
from public.books b
where b.status = 'published' and b.post_id is not null

union all
select 'tracks', t.post_id, t.id, t.title, t.image_path, t.image_alt,
       jsonb_build_object('snippet_path', t.snippet_path, 'snippet_seconds', t.snippet_seconds,
                          'full_track_url', t.full_track_url, 'links', t.links, 'released_on', t.released_on)
from public.tracks t
where t.status = 'published' and t.post_id is not null

union all
select 'games', g.post_id, g.id, g.title, g.image_path, g.image_alt,
       jsonb_build_object('platform', g.platform, 'hours_played', g.hours_played, 'rating', g.rating,
                          'play_status', g.play_status)
from public.games g
where g.status = 'published' and g.post_id is not null

union all
select 'hobby_items', h.post_id, h.id, h.title, h.image_path, h.image_alt,
       jsonb_build_object('category', h.category, 'subtitle', h.subtitle, 'url', h.url)
from public.hobby_items h
where h.status = 'published' and h.post_id is not null;
