-- The "about this" panel on an article that a hobby item links to shows the
-- item's picture the way its card does (a photo cropped square, a cut-out whole)
-- and its note, so the hobby details get image_style and note. Same view as in
-- 20261002100000_track_snippet_seconds.sql otherwise.
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
       jsonb_build_object('category', h.category, 'subtitle', h.subtitle, 'url', h.url,
                          'image_style', h.image_style, 'note', h.note)
from public.hobby_items h
where h.status = 'published' and h.post_id is not null;
