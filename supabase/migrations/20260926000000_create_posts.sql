-- Articles. Written through the admin editor (phase 2), read by everyone.

create table public.posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique
                  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text not null check (length(trim(title)) > 0),
  summary         text not null default '',
  body_md         text not null default '',
  tags            text[] not null default '{}',
  cover_image_url text,
  youtube_url     text,
  status          text not null default 'draft'
                  check (status in ('draft', 'published')),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- A published post always has a publish date, so lists can sort by it.
  constraint published_posts_have_date
    check (status = 'draft' or published_at is not null)
);

comment on table public.posts is 'Blog articles. Body is markdown.';

-- The article list: published posts, newest first.
create index posts_published_idx
  on public.posts (published_at desc)
  where status = 'published';

-- Tag filtering (`tags @> '{nextjs}'`).
create index posts_tags_idx on public.posts using gin (tags);

-- Keep updated_at honest without relying on the app to set it.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- Row Level Security: with RLS on, nothing is allowed unless a policy says so.
-- For now the only rule is "anyone may read published posts". Drafts are
-- invisible, and nobody can write through the API. The admin write policies
-- arrive in phase 2, tied to Ivan's account.
alter table public.posts enable row level security;

create policy "Published posts are readable by everyone"
  on public.posts
  for select
  to anon, authenticated
  using (status = 'published');

-- Table-level permission for the API roles. RLS above still decides which rows.
grant select on public.posts to anon, authenticated;
