-- One table per section: projects, books, tracks (songs), games, hobby items.
--
-- Every item table starts with the same columns:
--   title, status (draft | published), post_id (the article about it),
--   image_path + image_alt, badges, show_on_home, card_size, sort_order,
--   created_at, updated_at
-- followed by the fields that only make sense for that section.
--
-- Items have no pages of their own (a card links to an article, a live site or
-- a repo), so they have no slug. The checks below are the rules the admin
-- would otherwise have to remember; the database rejects anything that breaks
-- them.

-- ─── Projects ────────────────────────────────────────────────────────────────
create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (length(trim(title)) > 0),
  status       text not null default 'draft' check (status in ('draft', 'published')),
  post_id      uuid unique references public.posts (id) on delete set null,
  image_path   text,
  image_alt    text,
  badges       text[] not null default '{}',
  show_on_home boolean not null default false,
  card_size    text not null default 'small' check (card_size in ('small', 'wide')),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  summary      text,
  url          text check (url ~ '^https?://'),
  repo_url     text check (repo_url ~ '^https?://'),
  stack        text[] not null default '{}',
  started_on   date,

  -- A published project card has to lead somewhere.
  constraint published_projects_have_a_link
    check (status = 'draft' or url is not null or repo_url is not null or post_id is not null)
);

-- ─── Books ───────────────────────────────────────────────────────────────────
create table public.books (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (length(trim(title)) > 0),
  status           text not null default 'draft' check (status in ('draft', 'published')),
  post_id          uuid unique references public.posts (id) on delete set null,
  image_path       text,
  image_alt        text,
  badges           text[] not null default '{}',
  show_on_home     boolean not null default false,
  card_size        text not null default 'small' check (card_size in ('small', 'wide')),
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  author           text,
  reading_status   text not null default 'to_read' check (reading_status in ('to_read', 'reading', 'read')),
  started_on       date,
  finished_on      date,
  rating           smallint check (rating between 1 and 5),
  note             text,
  url              text check (url ~ '^https?://'),
  -- Filled in by the Open Library autofill in the admin.
  isbn             text check (isbn ~ '^([0-9]{9}[0-9X]|[0-9]{13})$'),
  open_library_key text,
  published_year   smallint check (published_year between 0 and 2100),
  page_count       integer check (page_count > 0),

  constraint books_finished_after_started
    check (finished_on is null or started_on is null or finished_on >= started_on)
);

-- ─── Tracks (songs by Spektral) ──────────────────────────────────────────────
create table public.tracks (
  id             uuid primary key default gen_random_uuid(),
  title          text not null check (length(trim(title)) > 0),
  status         text not null default 'draft' check (status in ('draft', 'published')),
  post_id        uuid unique references public.posts (id) on delete set null,
  image_path     text,
  image_alt      text,
  badges         text[] not null default '{}',
  show_on_home   boolean not null default false,
  card_size      text not null default 'small' check (card_size in ('small', 'wide')),
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  released_on    date,
  -- The song being made right now: shown as "Now producing" on the home page.
  in_progress    boolean not null default false,
  snippet_path   text,                 -- 20–30 s audio clip in Storage
  full_track_url text check (full_track_url ~ '^https?://'),
  links          jsonb not null default '{}' check (jsonb_typeof(links) = 'object'),
  note           text,

  -- A finished, published song always has its article and its audio snippet.
  -- A song still in progress can be published (for the home card) without them;
  -- the Music page only lists finished songs.
  constraint published_tracks_have_article_and_snippet
    check (status = 'draft' or in_progress or (post_id is not null and snippet_path is not null))
);

-- ─── Games ───────────────────────────────────────────────────────────────────
create table public.games (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (length(trim(title)) > 0),
  status       text not null default 'draft' check (status in ('draft', 'published')),
  post_id      uuid unique references public.posts (id) on delete set null,
  image_path   text,
  image_alt    text,
  badges       text[] not null default '{}',
  show_on_home boolean not null default false,
  card_size    text not null default 'small' check (card_size in ('small', 'wide')),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  platform     text,
  hours_played numeric(7, 1) check (hours_played >= 0),
  rating       smallint check (rating between 1 and 10),
  play_status  text not null default 'playing' check (play_status in ('playing', 'finished', 'dropped')),
  finished_on  date,

  -- Clicking a game opens the review, so a published game needs one.
  constraint published_games_have_review
    check (status = 'draft' or post_id is not null)
);

-- ─── Hobby items ─────────────────────────────────────────────────────────────
create table public.hobby_items (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (length(trim(title)) > 0),
  status       text not null default 'draft' check (status in ('draft', 'published')),
  post_id      uuid unique references public.posts (id) on delete set null,
  image_path   text,
  image_alt    text,
  badges       text[] not null default '{}',
  show_on_home boolean not null default false,
  card_size    text not null default 'small' check (card_size in ('small', 'wide')),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  category     text check (length(trim(category)) > 0),   -- e.g. Coffee, Plants, Learning
  subtitle     text,
  note         text,
  image_style  text not null default 'photo' check (image_style in ('photo', 'cutout', 'none')),
  caption      text,                                      -- white text on photo cards
  url          text check (url ~ '^https?://'),

  constraint published_hobby_items_have_category
    check (status = 'draft' or category is not null)
);

-- ─── Shared behaviour ────────────────────────────────────────────────────────

-- Section pages list published items in the admin's chosen order.
create index projects_listing_idx    on public.projects    (status, sort_order);
create index books_listing_idx       on public.books       (status, reading_status, sort_order);
create index tracks_listing_idx      on public.tracks      (status, sort_order);
create index games_listing_idx       on public.games       (status, sort_order);
create index hobby_items_listing_idx on public.hobby_items (status, category, sort_order);

-- Keep updated_at honest (the function already exists for posts).
create trigger projects_set_updated_at    before update on public.projects    for each row execute function public.set_updated_at();
create trigger books_set_updated_at       before update on public.books       for each row execute function public.set_updated_at();
create trigger tracks_set_updated_at      before update on public.tracks      for each row execute function public.set_updated_at();
create trigger games_set_updated_at       before update on public.games       for each row execute function public.set_updated_at();
create trigger hobby_items_set_updated_at before update on public.hobby_items for each row execute function public.set_updated_at();

-- An article belongs to at most one item. `unique (post_id)` covers each table;
-- this trigger also stops the same article being linked from two different
-- tables (say, a book and a game).
create function public.ensure_post_linked_once()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  linked_from text;
begin
  if new.post_id is null then
    return new;
  end if;

  select section into linked_from
  from (
              select 'projects'    as section, id, post_id from public.projects
    union all select 'books',                  id, post_id from public.books
    union all select 'tracks',                 id, post_id from public.tracks
    union all select 'games',                  id, post_id from public.games
    union all select 'hobby_items',            id, post_id from public.hobby_items
  ) as links
  where links.post_id = new.post_id
    and not (links.section = tg_table_name and links.id = new.id)
  limit 1;

  if linked_from is not null then
    raise exception 'This article is already linked from an item in %.', linked_from
      using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

create trigger projects_post_linked_once    before insert or update of post_id on public.projects    for each row execute function public.ensure_post_linked_once();
create trigger books_post_linked_once       before insert or update of post_id on public.books       for each row execute function public.ensure_post_linked_once();
create trigger tracks_post_linked_once      before insert or update of post_id on public.tracks      for each row execute function public.ensure_post_linked_once();
create trigger games_post_linked_once       before insert or update of post_id on public.games       for each row execute function public.ensure_post_linked_once();
create trigger hobby_items_post_linked_once before insert or update of post_id on public.hobby_items for each row execute function public.ensure_post_linked_once();
