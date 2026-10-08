-- The newsletter (Phase 6, step 2): subscribers and weekly digests.
--
-- Anyone can subscribe with just an email address (double opt-in); signed-in
-- readers can subscribe with one click (their account's address is already
-- proven). Once a week Ivan sends a digest of the new articles by hand from
-- the admin. Unsubscribing deletes the row: nothing is kept about people who
-- leave.
--
-- Visitors who aren't signed in only reach the subscribers through the three
-- newsletter_* functions below, and those need a server-only secret
-- (NEWSLETTER_SECRET: in .env.local and Vercel Production, never in the repo).
-- Without it, anyone holding the public key could create a pending row and
-- confirm it with their own token, subscribing a stranger who never saw the
-- email. The database stores only the secret's SHA-256, in a schema the API
-- doesn't expose. Confirm and unsubscribe links carry an HMAC of the
-- subscriber's id made with the same secret, checked by our server, so no
-- tokens are stored.
--
-- After applying, Ivan stores the hash once in the SQL editor (the value comes
-- from the session that generated the secret):
--   insert into private.newsletter_settings (secret_hash) values (decode('<64 hex>', 'hex'))
--   on conflict (id) do update set secret_hash = excluded.secret_hash, updated_at = now();

-- ─── The secret's hash (private) ────────────────────────────────────────────
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.newsletter_settings (
  id          boolean primary key default true check (id), -- exactly one row
  secret_hash bytea not null check (length(secret_hash) = 32),
  updated_at  timestamptz not null default now()
);
revoke all on private.newsletter_settings from public, anon, authenticated;

create function private.newsletter_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.newsletter_settings
    where secret_hash = sha256(convert_to(coalesce(p_secret, ''), 'UTF8'))
  );
$$;
revoke all on function private.newsletter_secret_ok(text) from public, anon, authenticated;

-- ─── Subscribers ────────────────────────────────────────────────────────────
create table public.newsletter_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique check (
                    email = lower(btrim(email))
                    and char_length(email) <= 254
                    and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
                  ),
  -- Set when a signed-in reader subscribed (or later took over the address).
  user_id         uuid unique references auth.users (id) on delete cascade,
  status          text not null default 'pending' check (status in ('pending', 'confirmed')),
  source          text not null check (source in ('form', 'account')),
  created_at      timestamptz not null default now(),
  -- The latest confirmation email; its link only works until the next one.
  confirm_sent_at timestamptz,
  -- When they said yes: the record of consent.
  confirmed_at    timestamptz,
  constraint newsletter_confirmed_has_date check (status = 'pending' or confirmed_at is not null)
);

comment on table public.newsletter_subscribers is
  'Newsletter subscribers. Unsubscribing deletes the row; pending rows expire after 7 days.';

-- The hourly cap counts recent confirmation emails.
create index newsletter_subscribers_sent_idx on public.newsletter_subscribers (confirm_sent_at);

-- ─── Digests ────────────────────────────────────────────────────────────────
-- One row per weekly digest. The next one covers articles published after
-- the last covers_until (the first: the 7 days before it). The recipients are
-- fixed when sending starts and progress is counted, so a failed send can go
-- on without emailing anyone twice. Only one digest can be sending at a time.
create table public.newsletter_digests (
  id            uuid primary key default gen_random_uuid(),
  status        text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  covers_from   timestamptz not null,
  covers_until  timestamptz not null,
  post_ids      uuid[] not null default '{}',
  recipient_ids uuid[] not null default '{}',
  sent_count    int not null default 0 check (sent_count >= 0),
  failed_count  int not null default 0 check (failed_count >= 0),
  constraint newsletter_digest_window check (covers_until > covers_from),
  constraint newsletter_digest_finished_has_date check (status = 'sending' or finished_at is not null)
);

comment on table public.newsletter_digests is 'Weekly newsletter digests, sent by hand from the admin.';

create unique index newsletter_digests_one_sending on public.newsletter_digests ((true)) where status = 'sending';
create index newsletter_digests_until_idx on public.newsletter_digests (covers_until desc);

-- ─── Who can do what ────────────────────────────────────────────────────────
-- Nobody writes these tables through the API directly. The admin (with the
-- two-factor code: is_admin()) reads and removes subscribers and manages
-- digests; everyone else only goes through the functions below.
alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_digests enable row level security;

create policy "Admins can read subscribers"
  on public.newsletter_subscribers for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can remove subscribers"
  on public.newsletter_subscribers for delete to authenticated
  using ((select public.is_admin()));

create policy "Admins can manage digests"
  on public.newsletter_digests for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.newsletter_subscribers from anon, authenticated;
grant select, delete on public.newsletter_subscribers to authenticated;
revoke all on public.newsletter_digests from anon, authenticated;
grant select, insert, update, delete on public.newsletter_digests to authenticated;

-- The truncate guard (20261007130000), as on every content table.
revoke truncate on public.newsletter_subscribers, public.newsletter_digests from service_role;
create trigger newsletter_subscribers_refuse_truncate
  before truncate on public.newsletter_subscribers
  for each statement execute function public.refuse_truncate();
create trigger newsletter_digests_refuse_truncate
  before truncate on public.newsletter_digests
  for each statement execute function public.refuse_truncate();

-- ─── Visitors (need the server's secret) ────────────────────────────────────
-- Subscribing: tells the server whether to send a confirmation email. A new
-- address gets a pending row and an email; a pending one whose last email is
-- over 24 hours old gets another; a recent pending or a confirmed address gets
-- nothing (the visitor sees the same answer either way, so the form never
-- reveals who is subscribed). At most 20 confirmation emails an hour across
-- the site (PT429: the API answers 429). Expired pending rows are cleared
-- here, on each sign-up.
create function public.newsletter_subscribe(p_secret text, p_email text)
returns table (subscriber_id uuid, sent_at timestamptz, send_email boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  addr text := lower(btrim(coalesce(p_email, '')));
  sub  public.newsletter_subscribers;
begin
  if not private.newsletter_secret_ok(p_secret) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  if char_length(addr) > 254 or addr !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'That doesn''t look like an email address.' using errcode = 'check_violation';
  end if;

  -- One sign-up at a time, so the hourly count can't be raced past.
  perform pg_advisory_xact_lock(hashtextextended('newsletter:subscribe', 0));

  delete from public.newsletter_subscribers as s
  where s.status = 'pending' and coalesce(s.confirm_sent_at, s.created_at) < now() - interval '7 days';

  select * into sub from public.newsletter_subscribers as s where s.email = addr for update;
  if found and (sub.status = 'confirmed' or sub.confirm_sent_at > now() - interval '24 hours') then
    return query select sub.id, sub.confirm_sent_at, false;
    return;
  end if;

  if (select count(*) from public.newsletter_subscribers as s
      where s.confirm_sent_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many sign-ups right now. Try again in an hour.' using errcode = 'PT429';
  end if;

  if found then
    update public.newsletter_subscribers as s set confirm_sent_at = now() where s.id = sub.id returning * into sub;
  else
    insert into public.newsletter_subscribers (email, status, source, confirm_sent_at)
    values (addr, 'pending', 'form', now())
    returning * into sub;
  end if;
  return query select sub.id, sub.confirm_sent_at, true;
end;
$$;

-- Confirming, from the latest confirmation email only (its send time is part
-- of the link) and within 7 days. Confirming twice is fine (true again).
create function public.newsletter_confirm(p_secret text, p_id uuid, p_sent_at timestamptz)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.newsletter_secret_ok(p_secret) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  update public.newsletter_subscribers as s
  set status = 'confirmed', confirmed_at = now()
  where s.id = p_id
    and s.status = 'pending'
    -- Links carry milliseconds (JavaScript dates); the column keeps microseconds.
    and date_trunc('milliseconds', s.confirm_sent_at) = date_trunc('milliseconds', p_sent_at)
    and s.confirm_sent_at > now() - interval '7 days';
  if found then
    return true;
  end if;
  return exists (select 1 from public.newsletter_subscribers as s where s.id = p_id and s.status = 'confirmed');
end;
$$;

-- Unsubscribing deletes the row. False if there was nothing to delete.
create function public.newsletter_unsubscribe(p_secret text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.newsletter_secret_ok(p_secret) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  delete from public.newsletter_subscribers as s where s.id = p_id;
  return found;
end;
$$;

revoke execute on function public.newsletter_subscribe(text, text) from public;
revoke execute on function public.newsletter_confirm(text, uuid, timestamptz) from public;
revoke execute on function public.newsletter_unsubscribe(text, uuid) from public;
grant execute on function public.newsletter_subscribe(text, text) to anon, authenticated;
grant execute on function public.newsletter_confirm(text, uuid, timestamptz) to anon, authenticated;
grant execute on function public.newsletter_unsubscribe(text, uuid) to anon, authenticated;

-- ─── Signed-in readers (their own subscription only) ───────────────────────
-- The address always comes from their account, never from the caller, so it
-- can't be someone else's; signing in already proved it, so it's confirmed at
-- once. A pending sign-up from the form with the same address is taken over.
create function public.newsletter_subscribe_me()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me   uuid := auth.uid();
  addr text;
begin
  if me is null then
    raise exception 'Not signed in.' using errcode = 'insufficient_privilege';
  end if;
  select lower(btrim(u.email)) into addr from auth.users as u where u.id = me;
  if coalesce(addr, '') = '' then
    raise exception 'Your account has no email address.' using errcode = 'check_violation';
  end if;
  -- The account changed its address since subscribing: the old row goes.
  delete from public.newsletter_subscribers as s where s.user_id = me and s.email <> addr;
  insert into public.newsletter_subscribers (email, user_id, status, source, confirmed_at)
  values (addr, me, 'confirmed', 'account', now())
  on conflict (email) do update
    set user_id = me,
        status = 'confirmed',
        confirmed_at = coalesce(public.newsletter_subscribers.confirmed_at, now());
end;
$$;

create function public.newsletter_unsubscribe_me()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in.' using errcode = 'insufficient_privilege';
  end if;
  delete from public.newsletter_subscribers as s
  where s.user_id = me or s.email = (select lower(btrim(u.email)) from auth.users as u where u.id = me);
end;
$$;

-- 'confirmed', 'pending' (signed up with the form, not confirmed yet) or null.
create function public.newsletter_my_status()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.status from public.newsletter_subscribers as s
  where s.user_id = (select auth.uid())
     or s.email = (select lower(btrim(u.email)) from auth.users as u where u.id = (select auth.uid()))
  order by (s.status = 'confirmed') desc
  limit 1;
$$;

revoke execute on function public.newsletter_subscribe_me() from public, anon;
revoke execute on function public.newsletter_unsubscribe_me() from public, anon;
revoke execute on function public.newsletter_my_status() from public, anon;
grant execute on function public.newsletter_subscribe_me() to authenticated;
grant execute on function public.newsletter_unsubscribe_me() to authenticated;
grant execute on function public.newsletter_my_status() to authenticated;

-- ─── Deleting an account removes its subscription ──────────────────────────
-- (CLAUDE.md: "Deleting an account: removes profile, avatar, and newsletter
-- subscription".) By account, and by address, so a subscription made with the
-- form before signing up goes too. Otherwise as in 20261007140000.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.admins where user_id = me) then
    raise exception 'The admin account can''t be deleted from Settings.' using errcode = 'insufficient_privilege';
  end if;
  delete from public.newsletter_subscribers as s
  where s.user_id = me or s.email = (select lower(btrim(u.email)) from auth.users as u where u.id = me);
  delete from auth.users where id = me;
end;
$$;
