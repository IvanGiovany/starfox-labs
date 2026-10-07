-- Security and rules check for the content tables and reader accounts.
-- Runs as a visitor, as the admin, as a signed-in reader (fake accounts made
-- here), then checks the guards, all inside a transaction that is rolled back
-- at the end, so it changes nothing. Every check prints PASS, or stops
-- with an error starting "FAIL".
--
-- Run it: paste this whole file into the Supabase SQL editor and press Run.
-- (The Supabase CLI has no command for running ad-hoc SQL on the hosted database.)

begin;

-- The admin's user id, read before switching roles.
select set_config('test.admin_id', (select user_id::text from public.admins limit 1), true);

-- ─── As a visitor (publishable key, not signed in) ─────────────────────────
set local role anon;

do $$
declare
  t text;
  sees_draft boolean;
begin
  foreach t in array array['projects', 'books', 'tracks', 'games', 'hobby_items'] loop
    execute format('select exists (select 1 from public.%I where status = ''draft'')', t) into sees_draft;
    if sees_draft then raise exception 'FAIL: visitors can see draft %', t; end if;
  end loop;
  if exists (select 1 from public.posts where status = 'draft') then
    raise exception 'FAIL: visitors can see draft posts';
  end if;
  raise notice 'PASS visitor: sees no drafts in any table';

  begin
    insert into public.books (title) values ('Visitor book');
    raise exception 'FAIL: a visitor added a book';
  exception when insufficient_privilege then
    raise notice 'PASS visitor: cannot add rows';
  end;

  begin
    perform public.reorder_items('books', array[]::uuid[]);
    raise exception 'FAIL: a visitor reordered items';
  exception when insufficient_privilege then
    raise notice 'PASS visitor: cannot reorder';
  end;

  begin
    -- Either "no rows" (RLS) or "permission denied" means the table is hidden.
    if exists (select 1 from public.admins) then
      raise exception 'FAIL: visitors can read the admins table';
    end if;
  exception when insufficient_privilege then
    null;
  end;
  if public.is_admin() then raise exception 'FAIL: a visitor counts as admin'; end if;
  raise notice 'PASS visitor: admins table hidden, is_admin() is false';

  if not exists (select 1 from public.profiles) then
    raise exception 'FAIL: visitors cannot read profiles';
  end if;
  begin
    update public.profiles set display_name = 'Visitor';
    raise exception 'FAIL: a visitor changed a profile';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.delete_my_account();
    raise exception 'FAIL: a visitor could call delete_my_account()';
  exception when insufficient_privilege then
    null;
  end;
  raise notice 'PASS visitor: reads profiles, cannot change them or delete accounts';
  -- (The home_feed check went with the view, 20261005130000. The home page's
  -- loaders link only to published articles; that's covered by unit tests.)
end;
$$;

reset role;

-- ─── As the admin ──────────────────────────────────────────────────────────
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.admin_id'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  review uuid;
  book uuid;
begin
  if not public.is_admin() then raise exception 'FAIL: the admin is not recognised by is_admin()'; end if;
  raise notice 'PASS admin: is_admin() is true';

  -- Drafts need only a title.
  insert into public.books (title) values ('Test book') returning id into book;
  insert into public.games (title) values ('Test game');
  insert into public.tracks (title) values ('Test song');
  insert into public.projects (title) values ('Test project');
  insert into public.hobby_items (title) values ('Test hobby');
  raise notice 'PASS admin: can add drafts with only a title';

  if (select reading_status from public.books where id = book) <> 'to_read' then
    raise exception 'FAIL: new books should default to to_read';
  end if;
  raise notice 'PASS admin: books default to TO READ';

  begin
    insert into public.tracks (title, status) values ('Unfinished song', 'published');
    raise exception 'FAIL: published a finished song without article and snippet';
  exception when check_violation then
    raise notice 'PASS rule: a finished song needs its article and snippet to publish';
  end;

  insert into public.tracks (title, status, in_progress) values ('Song in progress', 'published', true);
  raise notice 'PASS rule: a song in progress can be published for the home card';

  begin
    insert into public.games (title, status) values ('Unreviewed game', 'published');
    raise exception 'FAIL: published a game without a review';
  exception when check_violation then
    raise notice 'PASS rule: a game needs its review to publish';
  end;

  begin
    insert into public.projects (title, status) values ('Linkless project', 'published');
    raise exception 'FAIL: published a project with no link';
  exception when check_violation then
    raise notice 'PASS rule: a project needs a link to publish';
  end;

  begin
    insert into public.hobby_items (title, status) values ('Uncategorised', 'published');
    raise exception 'FAIL: published a hobby item without a category';
  exception when check_violation then
    raise notice 'PASS rule: a hobby item needs a category to publish';
  end;

  begin
    insert into public.books (title, rating) values ('Too good', 6);
    raise exception 'FAIL: accepted a book rating of 6';
  exception when check_violation then
    raise notice 'PASS rule: book ratings are 1-5';
  end;

  begin
    insert into public.games (title, rating) values ('Too good', 11);
    raise exception 'FAIL: accepted a game rating of 11';
  exception when check_violation then
    raise notice 'PASS rule: game ratings are 1-10';
  end;

  begin
    insert into public.posts (slug, title, status, body_md) values ('test-empty', 'Empty', 'published', '  ');
    raise exception 'FAIL: published an article with an empty body';
  exception when check_violation then
    raise notice 'PASS rule: a published article needs a body';
  end;

  insert into public.posts (slug, title, status, body_md) values ('test-review', 'Test review', 'published', 'Body')
  returning id into review;
  if (select published_at from public.posts where id = review) is null then
    raise exception 'FAIL: publishing did not set published_at';
  end if;
  raise notice 'PASS rule: publishing fills in the publish date';

  update public.books set post_id = review where id = book;
  begin
    insert into public.games (title, post_id) values ('Same article', review);
    raise exception 'FAIL: linked one article to two items';
  exception when unique_violation then
    raise notice 'PASS rule: an article belongs to at most one item (across sections)';
  end;

  perform public.reorder_items('books', array[book]);
  if (select sort_order from public.books where id = book) <> 1 then
    raise exception 'FAIL: reorder_items did not update sort_order';
  end if;
  raise notice 'PASS admin: can reorder a section';
end;
$$;

-- The admin account can't be deleted from Settings. (If it could, the FAIL
-- below would undo it: an error inside a DO block rolls back what it did.)
do $$
begin
  begin
    perform public.delete_my_account();
    raise exception 'FAIL: the admin account could be deleted (undone)';
  exception when insufficient_privilege then
    raise notice 'PASS admin: cannot delete the admin account from Settings';
  end;
end;
$$;

-- ─── Sign-up: fake accounts (as the owner) ─────────────────────────────────
-- Adding them runs the sign-up trigger, which must give each one a profile.
reset role;

do $$
declare
  reader uuid := gen_random_uuid();
  ada    uuid := gen_random_uuid();  -- Google, with a given name
  grace  uuid := gen_random_uuid();  -- Google, full name only
  fan    uuid := gen_random_uuid();  -- Google, a reserved first name
  sneaky uuid := gen_random_uuid();  -- email, but sends a name through the API
begin
  insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at) values
    (reader, 'authenticated', 'authenticated', 'reader@rls-check.invalid', '{"provider":"email"}', '{}', now()),
    (ada,    'authenticated', 'authenticated', 'ada@rls-check.invalid',    '{"provider":"google"}', '{"full_name":"Ada Lovelace","given_name":"Ada"}', now()),
    (grace,  'authenticated', 'authenticated', 'grace@rls-check.invalid',  '{"provider":"google"}', '{"name":"Grace  Brewster Hopper"}', now()),
    (fan,    'authenticated', 'authenticated', 'fan@rls-check.invalid',    '{"provider":"google"}', '{"full_name":"Gvan Fan","given_name":"Gvan"}', now()),
    (sneaky, 'authenticated', 'authenticated', 'sneaky@rls-check.invalid', '{"provider":"email"}', '{"full_name":"Mallory Name","given_name":"Mallory"}', now());
  perform set_config('test.reader_id', reader::text, true);
  perform set_config('test.ada_id', ada::text, true);

  if (select count(*) from public.profiles
      where id in (reader, ada, grace, fan, sneaky) and username ~ '^reader_[0-9]{6}$') <> 5 then
    raise exception 'FAIL: sign-up did not give every account a profile with a reader_ username';
  end if;
  raise notice 'PASS sign-up: every new account gets a profile with a random username';

  if (select display_name from public.profiles where id = ada) <> 'Ada'
    or (select display_name from public.profiles where id = grace) <> 'Grace'
    or (select display_name from public.profiles where id = fan) <> 'Reader'
    or (select display_name from public.profiles where id = reader) <> 'Reader'
    or (select display_name from public.profiles where id = sneaky) <> 'Reader' then
    raise exception 'FAIL: display names at sign-up: %', (
      select string_agg(display_name, ', ' order by display_name) from public.profiles
      where id in (reader, ada, grace, fan, sneaky));
  end if;
  raise notice 'PASS sign-up: Google gives the first name (never a reserved one), everyone else is "Reader"';

  if (select username || '/' || display_name from public.profiles
      where id = current_setting('test.admin_id')::uuid) is distinct from 'gvan/Gvan' then
    raise exception 'FAIL: the admin profile is not gvan / Gvan';
  end if;
  raise notice 'PASS sign-up: the admin is gvan / Gvan';
end;
$$;

-- ─── As a signed-in reader (an account that isn't in admins) ───────────────
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.reader_id'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  me         uuid := current_setting('test.reader_id')::uuid;
  admin_id   uuid := current_setting('test.admin_id')::uuid;
  t          text;
  sees_draft boolean;
  n          int;
begin
  if public.is_admin() then raise exception 'FAIL: a reader counts as admin'; end if;
  foreach t in array array['posts', 'projects', 'books', 'tracks', 'games', 'hobby_items'] loop
    execute format('select exists (select 1 from public.%I where status = ''draft'')', t) into sees_draft;
    if sees_draft then raise exception 'FAIL: readers can see draft %', t; end if;
  end loop;
  raise notice 'PASS reader: is_admin() is false, sees no drafts';

  -- Content: no adding, changing or deleting. One row is tried each time; if
  -- it ever worked, the FAIL would undo it.
  begin
    insert into public.posts (slug, title) values ('reader-post', 'Reader post');
    raise exception 'FAIL: a reader added a post';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.projects (title) values ('Reader project');
    raise exception 'FAIL: a reader added a project';
  exception when insufficient_privilege then
    null;
  end;
  update public.posts set title = title || '!' where id = (select id from public.posts limit 1);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a reader changed a post (undone)'; end if;
  delete from public.books where id = (select id from public.books limit 1);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a reader deleted a book (undone)'; end if;
  raise notice 'PASS reader: cannot add, change or delete content';

  -- Storage: only their own avatars folder, never media.
  begin
    insert into storage.objects (bucket_id, name) values ('media', 'writing/reader.webp');
    raise exception 'FAIL: a reader uploaded to media';
  exception when insufficient_privilege then
    null;
  end;
  insert into storage.objects (bucket_id, name) values ('avatars', me || '/avatar.webp');
  begin
    insert into storage.objects (bucket_id, name) values ('avatars', admin_id || '/avatar.webp');
    raise exception 'FAIL: a reader uploaded into someone else''s avatar folder';
  exception when insufficient_privilege then
    null;
  end;
  raise notice 'PASS reader: uploads only to their own avatars folder, never to media';

  -- Profiles: only their own, and only the three editable columns.
  update public.profiles
  set display_name = 'Test Reader', username = 'test_reader', avatar_path = me || '/avatar.webp'
  where id = me;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: a reader could not edit their own profile'; end if;
  update public.profiles set display_name = 'Hacked' where id = admin_id;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a reader changed the admin''s profile (undone)'; end if;
  begin
    update public.profiles set created_at = now() - interval '2 years' where id = me;
    raise exception 'FAIL: a reader changed their "member since" date';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.profiles (id, username, display_name) values (gen_random_uuid(), 'another_one', 'Another');
    raise exception 'FAIL: a reader added a profile';
  exception when insufficient_privilege then
    null;
  end;
  begin
    delete from public.profiles where id = me;
    raise exception 'FAIL: a reader deleted their profile without deleting the account';
  exception when insufficient_privilege then
    null;
  end;
  raise notice 'PASS reader: edits only their own profile; cannot change "member since", add or remove profiles';

  -- Names and picture paths.
  foreach t in array array['gvan', 'ivan', 'starfox_fan', 'admin', 'spektral2', 'Bad Name', 'ab'] loop
    begin
      update public.profiles set username = t where id = me;
      raise exception 'FAIL: the username "%" was allowed', t;
    exception when check_violation then
      null;
    end;
  end loop;
  foreach t in array array['Gvan', 'G-Van', 'IVAN', 'Starfox Labs', 'Spektral', ' padded ', ''] loop
    begin
      update public.profiles set display_name = t where id = me;
      raise exception 'FAIL: the display name "%" was allowed', t;
    exception when check_violation then
      null;
    end;
  end loop;
  begin
    update public.profiles
    set username = (select username from public.profiles where id = current_setting('test.ada_id')::uuid)
    where id = me;
    raise exception 'FAIL: a reader took someone else''s username';
  exception when unique_violation then
    null;
  end;
  begin
    update public.profiles set avatar_path = admin_id || '/avatar.webp' where id = me;
    raise exception 'FAIL: a reader pointed their picture at someone else''s folder';
  exception when check_violation then
    null;
  end;
  raise notice 'PASS reader: reserved names, bad or taken usernames and other people''s picture paths are refused';

  perform public.delete_my_account();
end;
$$;

reset role;

do $$
begin
  if exists (select 1 from auth.users where id = current_setting('test.reader_id')::uuid)
    or exists (select 1 from public.profiles where id = current_setting('test.reader_id')::uuid) then
    raise exception 'FAIL: delete_my_account() left the account or its profile';
  end if;
  raise notice 'PASS reader: deleting the account removes it and its profile';
end;
$$;

-- ─── Guards (as the tables' owner, like the dashboard) ─────────────────────
reset role;

do $$
declare
  t text;
  refused boolean := false;
begin
  foreach t in array array['posts', 'projects', 'books', 'tracks', 'games', 'hobby_items', 'admins', 'profiles'] loop
    if not exists (
      select 1 from pg_trigger
      where tgrelid = format('public.%I', t)::regclass
        and tgname = t || '_refuse_truncate'
        and tgenabled <> 'D'
    ) then
      raise exception 'FAIL: % has no truncate guard', t;
    end if;
    if has_table_privilege('anon', format('public.%I', t), 'TRUNCATE')
      or has_table_privilege('authenticated', format('public.%I', t), 'TRUNCATE')
      or has_table_privilege('service_role', format('public.%I', t), 'TRUNCATE') then
      raise exception 'FAIL: an API role can truncate %', t;
    end if;
  end loop;
  raise notice 'PASS guard: every content table has the truncate guard; API roles can''t truncate';

  -- The guard's behaviour, tried on a throwaway table (never a real one).
  create temp table guard_probe (x int) on commit drop;
  create trigger guard_probe_refuse_truncate before truncate on guard_probe
    for each statement execute function public.refuse_truncate();
  perform set_config('app.allow_truncate', '', true);
  begin
    truncate guard_probe;
  exception when raise_exception then
    refused := sqlerrm like 'Truncating % is blocked%';
  end;
  if not refused then raise exception 'FAIL: truncate was not refused'; end if;
  raise notice 'PASS guard: truncate is refused';

  perform set_config('app.allow_truncate', 'on', true);
  truncate guard_probe;
  perform set_config('app.allow_truncate', '', true);
  raise notice 'PASS guard: truncate works when switched on for the transaction';

  raise notice 'ALL CHECKS PASSED';
end;
$$;

-- Shown as the editor's result. Only reached if every check above passed
-- (any FAIL stops the script before this line).
select 'ALL CHECKS PASSED' as result;

rollback;
