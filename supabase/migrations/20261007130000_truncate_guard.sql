-- Stops the content tables being emptied by accident.
--
-- On 2026-10-06 every content table was emptied at once, drafts included,
-- while `admins` and the Storage files were left alone. That pattern fits a
-- TRUNCATE of `posts` with CASCADE (from the dashboard's "Truncate table" or
-- the SQL editor): it empties every table with a foreign key to posts, and it
-- skips the row rules that would have refused a plain DELETE.
--
-- RLS doesn't apply to TRUNCATE, and the dashboard works as the tables' owner,
-- so permissions alone can't stop it. A trigger can: TRUNCATE is refused
-- unless it's switched on for the current transaction. With CASCADE, every
-- table being emptied runs its own guard, so one refusal stops the lot.
--
-- To empty a table on purpose (back up first: npm run db:backup):
--   begin;
--   set local app.allow_truncate = 'on';
--   truncate public.<table>;
--   commit;

create function public.refuse_truncate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.allow_truncate', true), '') <> 'on' then
    raise exception 'Truncating %.% is blocked, to protect the content.', tg_table_schema, tg_table_name
      using hint = 'Back up first (npm run db:backup). To empty it on purpose, run in one go: '
        || 'begin; set local app.allow_truncate = ''on''; truncate ...; commit;';
  end if;
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['posts', 'projects', 'books', 'tracks', 'games', 'hobby_items', 'admins'] loop
    execute format(
      'create trigger %1$s_refuse_truncate before truncate on public.%1$I
         for each statement execute function public.refuse_truncate()', t);

    -- The API roles never need TRUNCATE (Supabase grants it by default). The
    -- Data API can't send one anyway; this just keeps it that way.
    execute format('revoke truncate on public.%I from anon, authenticated, service_role', t);
  end loop;
end;
$$;
