-- Who may use /admin. One row per admin (just Ivan).
--
-- Signing in (Supabase Auth) only proves who you are. Being in this table is
-- what makes you an admin. Every admin write policy (added in the next
-- migration) checks public.is_admin().

create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admins is 'Accounts allowed to use /admin.';

-- RLS on with NO policies: nobody can read or change this table through the
-- API, not even admins. Only is_admin() (below) and the SQL editor can.
alter table public.admins enable row level security;

-- "Is the person making this request an admin?"
-- security definer: runs with the function owner's rights, so it can read
-- public.admins even though the caller can't. It only ever answers about the
-- caller (auth.uid()), and returns a plain true/false.
create function public.is_admin()
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

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- After running this file, make your account an admin (replace the email):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@example.com';
