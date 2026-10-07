-- Reader accounts (Phase 4): a public profile per account, profile pictures,
-- and deleting your own account.
--
-- Accounts live in Supabase Auth (auth.users), which also holds the email
-- address. Nothing here stores an email: a profile is only what other people
-- may see (name, username, picture). Being an admin is still only a row in
-- public.admins, which nothing in this file can create.

-- ─── Reserved names ─────────────────────────────────────────────────────────
-- Names only the admin may use, so nobody can pass as Ivan or the site.
-- Compared without case, spaces or punctuation ("G-Van" counts as "gvan").
create function public.is_reserved_name(name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select n in ('admin', 'administrator', 'ivan', 'moderator', 'mod', 'staff', 'support',
               'official', 'root', 'system', 'deleted', 'deleteduser', 'anonymous', 'null')
      or n like '%gvan%' or n like '%starfox%' or n like '%spektral%'
  from (select regexp_replace(lower(coalesce(name, '')), '[^a-z0-9]', '', 'g') as n) as normalised;
$$;

-- ─── Profiles ───────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  -- Lowercase only, so "unique" is also unique ignoring case.
  username     text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (length(display_name) between 1 and 40 and display_name = trim(display_name)),
  -- A file in the avatars bucket, always inside the owner's own folder.
  avatar_path  text check (avatar_path like (id::text || '/%')),
  -- "Member since": ranks (Phase 7) count from here, so it can't be edited.
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'What others see of an account: name, username, picture. No emails.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Reserved names are refused, except on the admin's own profile.
-- security definer: reads public.admins, which callers can't.
create function public.check_profile_names()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (public.is_reserved_name(new.username) or public.is_reserved_name(new.display_name))
    and not exists (select 1 from public.admins where user_id = new.id) then
    raise exception 'That name is reserved.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profiles_check_names
  before insert or update of username, display_name on public.profiles
  for each row execute function public.check_profile_names();

-- Every new account gets a profile straight away: a random username
-- (reader_123456) to change in Settings, and a display name: for Google
-- sign-ups only the first name (Google's given_name, else the first word of the
-- full name), for everyone else "Reader" (Ivan, 2026-10-07). Nothing is taken
-- from the email address, which stays private. The provider is read from
-- raw_app_meta_data, which only the server sets; user metadata can be sent by
-- anyone signing up through the API. A failure here would block the sign-up,
-- so every value is made safe first (trimmed, at most 40 characters, never a
-- reserved name).
create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  google_name text := case when new.raw_app_meta_data ->> 'provider' = 'google' then
    trim(left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'given_name'), ''),
      (regexp_split_to_array(trim(coalesce(
        new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '\s+'))[1],
      ''), 40))
  else '' end;
  candidate text;
begin
  loop
    candidate := 'reader_' || lpad(floor(random() * 1000000)::int::text, 6, '0');
    exit when not exists (select 1 from public.profiles where username = candidate);
  end loop;

  insert into public.profiles (id, username, display_name, created_at)
  values (
    new.id,
    candidate,
    case when google_name = '' or public.is_reserved_name(google_name) then 'Reader' else google_name end,
    coalesce(new.created_at, now())
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

-- Accounts that already exist (the admin's): a profile each. The admin is Gvan.
insert into public.profiles (id, username, display_name, created_at)
select id, 'reader_' || lpad((row_number() over (order by created_at, id))::text, 6, '0'), 'Reader', created_at
from auth.users
on conflict (id) do nothing;

update public.profiles as p
set username = 'gvan', display_name = 'Gvan'
from public.admins as a
where a.user_id = p.id;

-- ─── Who can do what with profiles ──────────────────────────────────────────
-- Everyone reads profiles (comments show names and pictures). People edit only
-- their own; the admin can edit any (to fix an offensive name). Nobody adds or
-- removes profiles through the API: the trigger adds them, deleting the
-- account removes them.
alter table public.profiles enable row level security;

create policy "Profiles are readable by everyone"
  on public.profiles for select to anon, authenticated
  using (true);

create policy "People can edit their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Admins can edit any profile"
  on public.profiles for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Only these three columns can change through the API.
revoke insert, update, delete, truncate on public.profiles from anon, authenticated;
grant update (username, display_name, avatar_path) on public.profiles to authenticated;

-- The truncate guard (20261007130000), as on every content table.
revoke truncate on public.profiles from service_role;
create trigger profiles_refuse_truncate
  before truncate on public.profiles
  for each statement execute function public.refuse_truncate();

-- ─── Profile pictures: the "avatars" bucket ─────────────────────────────────
-- Public URLs (pictures show next to comments). Each account writes only to
-- its own folder, avatars/<user id>/. Pictures are cropped square and resized
-- in the browser to 512 px WebP first (~30–80 KB), so 1 MB is plenty.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1024 * 1024, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Storage needs "select" to replace or delete a file, so owners can list
-- their own folder (and only theirs). The admin can remove any picture.
create policy "People can list their own avatar files"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

create policy "People can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "People can replace their own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "People can delete their own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

-- ─── Deleting your own account ──────────────────────────────────────────────
-- Settings → Account. The server removes the picture first (Storage files
-- can't be deleted from SQL), then calls this. Deleting the auth user removes
-- the profile too (on delete cascade). From Phase 5, comments stay and show
-- "deleted user"; Phase 6 adds removing the newsletter subscription here.
-- The admin account can't be deleted this way, so Ivan can't lock himself out.
create function public.delete_my_account()
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
  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
