-- Two read-only views that combine the section tables.
--
-- security_invoker = true: a view normally runs with its owner's rights, which
-- would skip RLS. With this setting it runs with the *reader's* rights, so a
-- visitor sees exactly what they could see in the tables themselves.
--
-- A card only links to its article once that article is published, so draft
-- articles never produce broken links. Songs and games need their article, so
-- they only appear once it's live.

-- ─── home_feed: every item marked "Show on home", as one card shape ─────────
create view public.home_feed
with (security_invoker = true)
as
select
  'projects'::text                                  as section,
  p.id,
  p.title,
  'Projects · ' || p.title                          as label,
  coalesce(p.url, p.repo_url,
           case when a.status = 'published' then '/writing/' || a.slug end) as href,
  p.image_path,
  p.image_alt,
  'screenshot'::text                                as image_style,
  null::text                                        as caption,
  null::text                                        as state,
  p.badges,
  p.card_size,
  p.sort_order,
  p.created_at                                      as sort_date
from public.projects p
left join public.posts a on a.id = p.post_id
where p.status = 'published' and p.show_on_home

union all
select
  'books', b.id, b.title,
  'Reading · Books',
  case when a.status = 'published' then '/writing/' || a.slug end,
  b.image_path, b.image_alt, 'cover', null,
  b.reading_status,
  b.badges, b.card_size, b.sort_order,
  coalesce(b.finished_on::timestamptz, b.created_at)
from public.books b
left join public.posts a on a.id = b.post_id
where b.status = 'published' and b.show_on_home

union all
select
  'tracks', t.id, t.title,
  'Music · Spektral',
  case when a.status = 'published' then '/writing/' || a.slug end,
  t.image_path, t.image_alt, 'cover', null,
  case when t.in_progress then 'in_progress' end,
  t.badges, t.card_size, t.sort_order,
  coalesce(t.released_on::timestamptz, t.created_at)
from public.tracks t
left join public.posts a on a.id = t.post_id
where t.status = 'published' and t.show_on_home
  and (t.in_progress or a.status = 'published')

union all
select
  'games', g.id, g.title,
  'Games · ' || g.title,
  '/writing/' || a.slug,
  g.image_path, g.image_alt, 'screenshot', null,
  g.play_status,
  g.badges, g.card_size, g.sort_order,
  coalesce(g.finished_on::timestamptz, g.created_at)
from public.games g
join public.posts a on a.id = g.post_id and a.status = 'published'
where g.status = 'published' and g.show_on_home

union all
select
  'hobby_items', h.id, h.title,
  'Hobbies · ' || h.category,
  coalesce(h.url, case when a.status = 'published' then '/writing/' || a.slug end),
  h.image_path, h.image_alt, h.image_style, h.caption,
  null,
  h.badges, h.card_size, h.sort_order,
  h.created_at
from public.hobby_items h
left join public.posts a on a.id = h.post_id
where h.status = 'published' and h.show_on_home;

comment on view public.home_feed is
  'Published items marked show_on_home, from every section, as one card shape.';

-- ─── post_items: the item an article is about, for its "about this" panel ───
create view public.post_items
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
       jsonb_build_object('snippet_path', t.snippet_path, 'full_track_url', t.full_track_url,
                          'links', t.links, 'released_on', t.released_on)
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

comment on view public.post_items is
  'For each article, the published item that links to it (for the "about this" panel).';

grant select on public.home_feed, public.post_items to anon, authenticated;
