-- Comments on articles (Phase 5), and a limit on username changes.
--
-- Readers write comments straight from the browser with the publishable key,
-- so every rule lives here, not in the app: anyone could call the API with
-- that key directly. Signed-in readers comment on published articles as
-- themselves; everyone reads them; one level of replies; edit your own any
-- time (marked "edited"); delete your own, the admin deletes any; a basic rate
-- limit. Comments go live straight away (no approval queue: Ivan, 2026-10-08).

-- ─── Comments ───────────────────────────────────────────────────────────────
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  -- Deleting an article deletes its comments (Ivan, 2026-10-08).
  post_id    uuid not null references public.posts (id) on delete cascade,
  -- Always the person who wrote it (the insert policy checks). null = the
  -- account was deleted ("deleted user"), or the comment itself was (below).
  user_id    uuid default auth.uid() references public.profiles (id) on delete set null,
  -- A reply's top-level comment. Replies can't have replies (trigger below).
  parent_id  uuid references public.comments (id) on delete cascade,
  -- Plain text: shown as written, links not clickable (Ivan, 2026-10-08).
  body       text not null,
  -- Written by the admin, for the AUTHOR badge (readers can't read admins).
  -- Set by the trigger, never by the writer.
  by_admin   boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at  timestamptz,
  -- A deleted comment that still has replies stays as a placeholder ("This
  -- comment was deleted."), so other people's replies survive. Its text and
  -- author are cleared.
  deleted_at timestamptz,

  constraint comments_body_length check (
    deleted_at is not null
    or (char_length(body) between 1 and 2000 and body !~ '^\s' and body !~ '\s$')
  ),
  constraint comments_placeholders_are_empty check (
    deleted_at is null or (body = '' and user_id is null)
  )
);

comment on table public.comments is 'Comments on articles. Plain text, one level of replies.';

-- An article's comments, newest first; replies under their comment; the rate
-- limit (one person's recent comments); the admin's list of the latest.
create index comments_post_idx on public.comments (post_id, created_at desc);
create index comments_parent_idx on public.comments (parent_id);
create index comments_user_idx on public.comments (user_id, created_at desc);
create index comments_created_idx on public.comments (created_at desc);

-- ─── Rules for new comments ─────────────────────────────────────────────────
-- security definer: reads admins (for by_admin and the exemption) and other
-- people's comments (the parent, the rate limit).
--
-- Checks run in this order, so a refused reply says why rather than "slow
-- down": the reply rules, then the rate limit. Inserts without a signed-in
-- user (the SQL editor, `npm run db:restore`) skip the per-person rules but
-- still follow the reply rules.
create function public.check_new_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  me     uuid := auth.uid();
  parent record;
begin
  if new.parent_id is not null then
    -- "for share" waits for a delete of the parent that's under way, so a
    -- reply never slips in just as its comment is removed.
    select post_id, parent_id, deleted_at into parent
    from public.comments where id = new.parent_id
    for share;
    if not found then
      raise exception 'That comment no longer exists.' using errcode = 'check_violation';
    end if;
    if parent.parent_id is not null then
      raise exception 'Replies can''t have replies: reply to the comment above instead.'
        using errcode = 'check_violation';
    end if;
    if parent.post_id <> new.post_id then
      raise exception 'A reply must be on the same article as its comment.' using errcode = 'check_violation';
    end if;
    if me is not null and parent.deleted_at is not null then
      raise exception 'That comment was deleted.' using errcode = 'check_violation';
    end if;
  end if;

  new.by_admin := new.by_admin or exists (select 1 from public.admins where user_id = new.user_id);

  -- Rate limit (Ivan, 2026-10-08): one comment every 20 seconds and 30 a day
  -- (any 24 hours) per account; the admin is exempt. The lock makes one
  -- person's comments wait for each other, so two sent at once can't both
  -- slip under the limit. Code PT429 makes the API answer 429 Too Many Requests.
  if me is not null and not exists (select 1 from public.admins where user_id = me) then
    perform pg_advisory_xact_lock(hashtextextended('comments:' || me::text, 0));
    if exists (select 1 from public.comments
               where user_id = me and created_at > now() - interval '20 seconds') then
      raise exception 'Slow down: wait a few seconds between comments.' using errcode = 'PT429';
    end if;
    if (select count(*) from public.comments
        where user_id = me and created_at > now() - interval '24 hours') >= 30 then
      raise exception 'That''s 30 comments in a day, the most allowed. Try again tomorrow.' using errcode = 'PT429';
    end if;
  end if;

  return new;
end;
$$;

create trigger comments_check_new
  before insert on public.comments
  for each row execute function public.check_new_comment();

-- Editing the text marks the comment "edited". (Clearing it into a
-- placeholder isn't an edit.)
create function public.mark_comment_edited()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.body is distinct from old.body and new.deleted_at is null then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger comments_mark_edited
  before update of body on public.comments
  for each row execute function public.mark_comment_edited();

-- ─── Who can do what with comments ──────────────────────────────────────────
-- Everyone reads the comments on published articles; the admin reads all.
-- Signed-in readers add comments to published articles as themselves, and
-- edit the text of their own. Nobody deletes rows directly: delete_comment()
-- decides between removing a comment and leaving a placeholder.
alter table public.comments enable row level security;

create policy "Comments on published articles are readable by everyone"
  on public.comments for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.status = 'published'));

create policy "Admins can read all comments"
  on public.comments for select to authenticated
  using ((select public.is_admin()));

create policy "Signed-in people can comment on published articles"
  on public.comments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
  );

create policy "People can edit their own comments"
  on public.comments for update to authenticated
  using (user_id = (select auth.uid()) and deleted_at is null)
  with check (user_id = (select auth.uid()) and deleted_at is null);

-- Only these columns can be written through the API: the writer, the time,
-- by_admin and the placeholder fields are the database's.
revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (post_id, parent_id, body) on public.comments to authenticated;
grant update (body) on public.comments to authenticated;

-- The truncate guard (20261007130000), as on every content table.
revoke truncate on public.comments from service_role;
create trigger comments_refuse_truncate
  before truncate on public.comments
  for each statement execute function public.refuse_truncate();

-- ─── Deleting a comment ─────────────────────────────────────────────────────
-- The writer deletes their own; the admin deletes any. A comment with replies
-- becomes a placeholder (text and author cleared); otherwise it's removed.
-- Removing a placeholder's last reply removes the placeholder too. Returns
-- 'removed', 'placeholder', or 'gone' (it was already deleted).
create function public.delete_comment(comment_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  c  record;
begin
  if me is null then
    raise exception 'Not signed in.' using errcode = 'insufficient_privilege';
  end if;

  select id, user_id, parent_id, deleted_at into c
  from public.comments where id = comment_id
  for update;
  if not found or c.deleted_at is not null then
    return 'gone';
  end if;
  if c.user_id is distinct from me and not public.is_admin() then
    raise exception 'You can only delete your own comments.' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.comments where parent_id = c.id) then
    update public.comments set body = '', user_id = null, edited_at = null, deleted_at = now() where id = c.id;
    return 'placeholder';
  end if;

  delete from public.comments where id = c.id;
  if c.parent_id is not null then
    delete from public.comments as p
    where p.id = c.parent_id
      and p.deleted_at is not null
      and not exists (select 1 from public.comments as r where r.parent_id = p.id);
  end if;
  return 'removed';
end;
$$;

revoke execute on function public.delete_comment(uuid) from public, anon;
grant execute on function public.delete_comment(uuid) to authenticated;

-- Deleting an account (delete_my_account(), 20261007140000) removes the
-- profile, which sets user_id to null on that person's comments: they stay
-- and show as "deleted user".
comment on function public.delete_my_account() is
  'Deletes the caller''s account and profile; their comments stay as "deleted user". Refuses admins.';

-- ─── Username changes: once every 30 days ───────────────────────────────────
-- So nobody can dodge moderation by renaming (Ivan, 2026-10-07). The first
-- change (away from the random reader_123456) can happen any time; after
-- that, 30 days between changes. The admin is exempt, and so are changes
-- without a signed-in user (the SQL editor). A change the admin makes to
-- someone's username counts as their change.
alter table public.profiles add column username_changed_at timestamptz;

comment on column public.profiles.username_changed_at is
  'Last username change; the next is allowed 30 days later. Not editable through the API.';

create function public.limit_username_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if new.username is distinct from old.username then
    if me is not null
      and not exists (select 1 from public.admins where user_id = me)
      and old.username_changed_at > now() - interval '30 days' then
      raise exception 'You can change your username once every 30 days.' using errcode = 'PT429';
    end if;
    new.username_changed_at := now();
  end if;
  return new;
end;
$$;

-- Runs after profiles_check_names (triggers run in name order), so a
-- reserved name is still refused as reserved.
create trigger profiles_limit_username_changes
  before update of username on public.profiles
  for each row execute function public.limit_username_changes();

-- When someone last renamed is nobody else's business: profiles stay public
-- column by column, without the new one. (The app always names its columns.)
revoke select on public.profiles from anon, authenticated;
grant select (id, username, display_name, avatar_path, created_at, updated_at)
  on public.profiles to anon, authenticated;

-- For Settings: when the caller may change their username again, or null if
-- they may now.
create function public.next_username_change()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select p.username_changed_at + interval '30 days'
  from public.profiles as p
  where p.id = (select auth.uid())
    and p.username_changed_at > now() - interval '30 days'
    and not exists (select 1 from public.admins where user_id = p.id);
$$;

revoke execute on function public.next_username_change() from public, anon;
grant execute on function public.next_username_change() to authenticated;
