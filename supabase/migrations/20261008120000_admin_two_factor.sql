-- Admin powers require two-factor sign-in (Phase 6, step 1 part B).
--
-- Before the newsletter can email every subscriber, the account that can send
-- it needs more than a password-free email link or a Google sign-in: a code
-- from an authenticator app (Supabase MFA, TOTP). A session that has passed
-- the code carries `aal: "aal2"` in its token; before that it's "aal1".
--
-- Two questions, kept apart (as lib/auth.ts does):
--   - public.is_admin_account(): is the caller the admin's account? Identity
--     only, no code needed (the header's Admin link, Settings' rules).
--   - public.is_admin(): may the caller use admin powers right now? Now also
--     needs aal2. Every "Admins can …" policy (content, comments, profiles,
--     Storage), reorder_items() and delete_comment() go through it, so they all
--     need the code from here on, whatever the app does.
--
-- Rules that are about identity read public.admins directly and are
-- unchanged: reserved names (check_profile_names), the admin's exemption from
-- the comment rate limit and the username limit, the AUTHOR badge, and
-- delete_my_account() refusing the admin.
--
-- Applied only after Ivan set up his authenticator and signed in with it
-- (2026-10-08). Lost every device? See CLAUDE.md ("If Ivan loses every device").

create function public.is_admin_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin_account() from public;
grant execute on function public.is_admin_account() to anon, authenticated;

-- Same signature, so every policy that calls it follows the new rule at once.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  )
  and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

comment on function public.is_admin() is
  'Admin powers: the caller is in public.admins AND passed two-factor sign-in (aal2).';
comment on function public.is_admin_account() is
  'Identity: the caller is in public.admins (no two-factor needed).';
