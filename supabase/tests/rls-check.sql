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
  if public.is_admin() or public.is_admin_account() then raise exception 'FAIL: a visitor counts as admin'; end if;
  raise notice 'PASS visitor: admins table hidden, is_admin() and is_admin_account() are false';

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

  begin
    insert into public.comments (post_id, body) values (gen_random_uuid(), 'Visitor comment');
    raise exception 'FAIL: a visitor added a comment';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.delete_comment(gen_random_uuid());
    raise exception 'FAIL: a visitor could call delete_comment()';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform (select username_changed_at from public.profiles limit 1);
    raise exception 'FAIL: visitors can see when someone changed their username';
  exception when insufficient_privilege then
    null;
  end;
  raise notice 'PASS visitor: cannot comment or delete comments, cannot see when someone renamed';
  -- (The home_feed check went with the view, 20261005130000. The home page's
  -- loaders link only to published articles; that's covered by unit tests.)
end;
$$;

reset role;

-- ─── As the admin ──────────────────────────────────────────────────────────
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.admin_id'), 'role', 'authenticated', 'aal', 'aal2')::text, true);
set local role authenticated;

do $$
declare
  review uuid;
  second uuid;
  draft  uuid;
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

  -- Articles for the comment checks further down.
  insert into public.posts (slug, title, status, body_md) values ('test-review-2', 'Second test article', 'published', 'Body')
  returning id into second;
  insert into public.posts (slug, title) values ('test-draft', 'Test draft') returning id into draft;
  perform set_config('test.post_id', review::text, true);
  perform set_config('test.post2_id', second::text, true);
  perform set_config('test.draft_id', draft::text, true);

  -- The username limit doesn't apply to the admin.
  update public.profiles set username = 'gvan_renamed' where id = current_setting('test.admin_id')::uuid;
  update public.profiles set username = 'gvan' where id = current_setting('test.admin_id')::uuid;
  raise notice 'PASS admin: can change the username any time';
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

-- ─── The admin without the two-factor code (aal1) ──────────────────────────
-- Signed in, but the authenticator code not entered yet: still the admin's
-- account (identity), but no admin powers (20261008120000).
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.admin_id'), 'role', 'authenticated', 'aal', 'aal1')::text, true);

do $$
declare
  admin_id uuid := current_setting('test.admin_id')::uuid;
  n        int;
begin
  if public.is_admin() then raise exception 'FAIL: the admin has admin powers without the two-factor code'; end if;
  if not public.is_admin_account() then raise exception 'FAIL: is_admin_account() should not need the code'; end if;
  begin
    insert into public.books (title) values ('Without the code');
    raise exception 'FAIL: the admin added a book without the two-factor code';
  exception when insufficient_privilege then
    null;
  end;
  if exists (select 1 from public.posts where status = 'draft') then
    raise exception 'FAIL: drafts are visible without the two-factor code';
  end if;
  update public.posts set title = title || '!' where id = current_setting('test.post_id')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: the admin edited an article without the two-factor code (undone)'; end if;
  begin
    perform public.reorder_items('books', array[]::uuid[]);
    raise exception 'FAIL: the admin reordered without the two-factor code';
  exception when insufficient_privilege then
    null;
  end;
  raise notice 'PASS admin without the code: no admin powers (no drafts, no writes, no reordering)';

  -- Identity rules still hold: the reserved name stays theirs.
  update public.profiles set display_name = 'Gvan' where id = admin_id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: the admin couldn''t keep the reserved name without the code'; end if;
  raise notice 'PASS admin without the code: still the admin account (is_admin_account(), reserved name)';
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
  if public.is_admin() or public.is_admin_account() then raise exception 'FAIL: a reader counts as admin'; end if;
  -- Even with a two-factor session of their own.
  perform set_config('request.jwt.claims', json_build_object('sub', me, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  if public.is_admin() or public.is_admin_account() then raise exception 'FAIL: a reader with a two-factor code counts as admin'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', me, 'role', 'authenticated')::text, true);
  foreach t in array array['posts', 'projects', 'books', 'tracks', 'games', 'hobby_items'] loop
    execute format('select exists (select 1 from public.%I where status = ''draft'')', t) into sees_draft;
    if sees_draft then raise exception 'FAIL: readers can see draft %', t; end if;
  end loop;
  raise notice 'PASS reader: not the admin (even with a two-factor code), sees no drafts';

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

  -- Names first, while the username has never been changed: after the first
  -- change, the 30-day limit would refuse these for the wrong reason.
  foreach t in array array['gvan', 'ivan', 'starfox_fan', 'admin', 'spektral2', 'Bad Name', 'ab'] loop
    begin
      update public.profiles set username = t where id = me;
      raise exception 'FAIL: the username "%" was allowed', t;
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
  raise notice 'PASS reader: reserved, malformed and taken usernames are refused';

  -- Profiles: only their own, and only the three editable columns. (The
  -- username change here is the reader's first, which is always allowed.)
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

  foreach t in array array['Gvan', 'G-Van', 'IVAN', 'Starfox Labs', 'Spektral', ' padded ', ''] loop
    begin
      update public.profiles set display_name = t where id = me;
      raise exception 'FAIL: the display name "%" was allowed', t;
    exception when check_violation then
      null;
    end;
  end loop;
  begin
    update public.profiles set avatar_path = admin_id || '/avatar.webp' where id = me;
    raise exception 'FAIL: a reader pointed their picture at someone else''s folder';
  exception when check_violation then
    null;
  end;
  raise notice 'PASS reader: reserved display names and other people''s picture paths are refused';

  -- Username changes: the first was free (above); the next waits 30 days.
  begin
    update public.profiles set username = 'test_reader_2' where id = me;
    raise exception 'FAIL: a reader changed their username twice within 30 days';
  exception when sqlstate 'PT429' then
    null;
  end;
  if public.next_username_change() is null
    or public.next_username_change() < now() + interval '29 days' then
    raise exception 'FAIL: next_username_change() should be 30 days away, not %', public.next_username_change();
  end if;
  update public.profiles set display_name = 'Renamed Reader' where id = me;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: the display name should change any time'; end if;
  begin
    update public.profiles set username_changed_at = null where id = me;
    raise exception 'FAIL: a reader reset their username-change date';
  exception when insufficient_privilege then
    null;
  end;
  raise notice 'PASS reader: one username change every 30 days (display names any time); the date can''t be reset';
end;
$$;

-- ─── Comments ──────────────────────────────────────────────────────────────
-- Still the reader. The rate limit is stepped around by moving the reader's
-- comments back in time as the owner (inside this rolled-back transaction).
-- now() is the same all through a transaction, so every comment added here
-- counts as "just now" until it's moved back.

do $$
declare
  me       uuid := current_setting('test.reader_id')::uuid;
  admin_id uuid := current_setting('test.admin_id')::uuid;
  post     uuid := current_setting('test.post_id')::uuid;
  draft    uuid := current_setting('test.draft_id')::uuid;
  c        record;
  t        text;
begin
  -- Refused before the reader posts anything, so the rate limit isn't the reason.
  begin
    insert into public.comments (post_id, body) values (draft, 'On a draft');
    raise exception 'FAIL: a reader commented on a draft';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.comments (post_id, user_id, body) values (post, admin_id, 'As someone else');
    raise exception 'FAIL: a reader commented as someone else';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.comments (post_id, body, by_admin) values (post, 'Fake author badge', true);
    raise exception 'FAIL: a reader gave their comment the author badge';
  exception when insufficient_privilege then
    null;
  end;
  raise notice 'PASS comments: readers can''t comment on drafts, as someone else, or with the author badge';

  foreach t in array array['', '   ', ' padded', 'padded ', repeat('x', 2001)] loop
    begin
      insert into public.comments (post_id, body) values (post, t);
      raise exception 'FAIL: the comment "%" was allowed', left(t, 20);
    exception when check_violation then
      null;
    end;
  end loop;
  raise notice 'PASS comments: empty, padded and over-2000-character comments are refused';

  insert into public.comments (post_id, body) values (post, repeat('x', 2000)) returning * into c;
  if c.user_id <> me or c.by_admin or c.parent_id is not null or c.edited_at is not null or c.deleted_at is not null then
    raise exception 'FAIL: a new comment''s fields: %', row_to_json(c);
  end if;
  perform set_config('test.comment_id', c.id::text, true);
  raise notice 'PASS comments: a reader comments as themselves (2000 characters allowed)';

  begin
    insert into public.comments (post_id, body) values (post, 'Too soon');
    raise exception 'FAIL: two comments within 20 seconds';
  exception when sqlstate 'PT429' then
    null;
  end;
  raise notice 'PASS comments: one comment every 20 seconds';

  update public.comments set body = 'First comment, edited' where id = c.id;
  if (select edited_at from public.comments where id = c.id) is null then
    raise exception 'FAIL: editing didn''t mark the comment edited';
  end if;
  begin
    update public.comments set post_id = draft where id = c.id;
    raise exception 'FAIL: a reader moved their comment to another article';
  exception when insufficient_privilege then
    null;
  end;
  begin
    update public.comments set created_at = now() - interval '1 day' where id = c.id;
    raise exception 'FAIL: a reader changed their comment''s date';
  exception when insufficient_privilege then
    null;
  end;
  begin
    delete from public.comments where id = c.id;
    raise exception 'FAIL: a reader deleted a comment row directly';
  exception when insufficient_privilege then
    null;
  end;
  raise notice 'PASS comments: readers edit only the text (marked edited), never delete rows directly';
end;
$$;

-- As the owner: move the reader's comment back a minute and give them 29
-- more from two hours ago, so they're at the day's limit of 30.
reset role;
select set_config('request.jwt.claims', '', true);

do $$
declare
  me  uuid := current_setting('test.reader_id')::uuid;
  ids uuid[];
begin
  update public.comments set created_at = created_at - interval '1 minute' where user_id = me;
  with added as (
    insert into public.comments (post_id, user_id, body, created_at)
    select current_setting('test.post_id')::uuid, me, 'Older comment ' || i, now() - interval '2 hours'
    from generate_series(1, 29) as i
    returning id
  )
  select array_agg(id) into ids from added;
  perform set_config('test.old_ids', array_to_string(ids, ','), true);
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.reader_id'), 'role', 'authenticated')::text, true);
set local role authenticated;

-- delete_comment() is always called in a statement of its own, and its answer
-- checked separately: a check in the same statement would read the table as it
-- was when the statement began, before the delete.
do $$
declare
  old     uuid[] := string_to_array(current_setting('test.old_ids'), ',')::uuid[];
  outcome text;
begin
  begin
    insert into public.comments (post_id, body) values (current_setting('test.post_id')::uuid, 'Number 31');
    raise exception 'FAIL: a 31st comment within a day';
  exception when sqlstate 'PT429' then
    if sqlerrm not like '%30 comments%' then raise exception 'FAIL: wrong limit: %', sqlerrm; end if;
  end;
  raise notice 'PASS comments: at most 30 comments a day';

  outcome := public.delete_comment(old[1]);
  if outcome <> 'removed' or exists (select 1 from public.comments where id = old[1]) then
    raise exception 'FAIL: a reader couldn''t delete their own comment (%)', outcome;
  end if;
  outcome := public.delete_comment(old[1]);
  if outcome <> 'gone' then
    raise exception 'FAIL: deleting an already deleted comment should say "gone", not %', outcome;
  end if;
  raise notice 'PASS comments: readers delete their own comments (no replies: removed)';
end;
$$;

-- Another reader (Ada).
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.ada_id'), 'role', 'authenticated')::text, true);

do $$
declare
  first uuid := current_setting('test.comment_id')::uuid;
  post  uuid := current_setting('test.post_id')::uuid;
  reply uuid;
  n     int;
begin
  update public.comments set body = 'Hacked' where id = first;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a reader edited someone else''s comment (undone)'; end if;
  begin
    perform public.delete_comment(first);
    raise exception 'FAIL: a reader deleted someone else''s comment (undone)';
  exception when insufficient_privilege then
    null;
  end;
  raise notice 'PASS comments: readers can''t edit or delete other people''s comments';

  begin
    insert into public.comments (post_id, parent_id, body)
    values (current_setting('test.post2_id')::uuid, first, 'Reply on another article');
    raise exception 'FAIL: a reply on a different article from its comment';
  exception when check_violation then
    null;
  end;
  insert into public.comments (post_id, parent_id, body) values (post, first, 'A reply') returning id into reply;
  perform set_config('test.reply_id', reply::text, true);
  -- The reply rules come before the rate limit, so this is refused as a reply to a reply.
  begin
    insert into public.comments (post_id, parent_id, body) values (post, reply, 'A reply to a reply');
    raise exception 'FAIL: a reply to a reply';
  exception when check_violation then
    null;
  end;
  raise notice 'PASS comments: one level of replies, on the same article';
end;
$$;

-- The admin without the two-factor code can't delete other people's comments.
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.admin_id'), 'role', 'authenticated', 'aal', 'aal1')::text, true);

do $$
begin
  begin
    perform public.delete_comment(current_setting('test.comment_id')::uuid);
    raise exception 'FAIL: the admin deleted a reader''s comment without the two-factor code (undone)';
  exception when insufficient_privilege then
    null;
  end;
  raise notice 'PASS comments: without the two-factor code the admin can''t delete other people''s comments';
end;
$$;

-- The admin (with the code).
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.admin_id'), 'role', 'authenticated', 'aal', 'aal2')::text, true);

do $$
declare
  first  uuid := current_setting('test.comment_id')::uuid;
  post   uuid := current_setting('test.post_id')::uuid;
  mine    uuid;
  areply  uuid;
  c       record;
  n       int;
  outcome text;
begin
  insert into public.comments (post_id, body) values (post, 'From the author') returning id into mine;
  insert into public.comments (post_id, parent_id, body) values (post, first, 'Author reply') returning id into areply;
  if not (select by_admin from public.comments where id = mine) then
    raise exception 'FAIL: the admin''s comment has no author badge';
  end if;
  raise notice 'PASS comments: the admin''s comments carry the author badge; no rate limit for the admin';

  update public.comments set body = 'Edited by the admin' where id = first;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: the admin edited a reader''s comment (undone)'; end if;

  outcome := public.delete_comment(first);
  if outcome <> 'placeholder' then
    raise exception 'FAIL: deleting a comment with replies should leave a placeholder, not %', outcome;
  end if;
  select * into c from public.comments where id = first;
  if c.body <> '' or c.user_id is not null or c.edited_at is not null or c.deleted_at is null then
    raise exception 'FAIL: the placeholder still holds the comment: %', row_to_json(c);
  end if;
  if (select count(*) from public.comments where parent_id = first) <> 2 then
    raise exception 'FAIL: the replies went with the deleted comment';
  end if;
  raise notice 'PASS comments: the admin deletes any comment; one with replies becomes an empty placeholder and keeps them';

  begin
    insert into public.comments (post_id, parent_id, body) values (post, first, 'Reply to a deleted comment');
    raise exception 'FAIL: a reply to a deleted comment';
  exception when check_violation then
    null;
  end;
  outcome := public.delete_comment(areply);
  if outcome <> 'removed' or exists (select 1 from public.comments where id = areply) then
    raise exception 'FAIL: the admin couldn''t delete their own reply (%)', outcome;
  end if;
  if not exists (select 1 from public.comments where id = first) then
    raise exception 'FAIL: the placeholder should stay while it still has a reply';
  end if;
  raise notice 'PASS comments: no replies to deleted comments; the placeholder stays while replies remain';
end;
$$;

-- Ada deletes the last reply: the placeholder goes with it.
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.ada_id'), 'role', 'authenticated')::text, true);

do $$
declare
  outcome text := public.delete_comment(current_setting('test.reply_id')::uuid);
begin
  if outcome <> 'removed' or exists (select 1 from public.comments where id = current_setting('test.reply_id')::uuid) then
    raise exception 'FAIL: a reader couldn''t delete their own reply (%)', outcome;
  end if;
  if exists (select 1 from public.comments where id = current_setting('test.comment_id')::uuid) then
    raise exception 'FAIL: removing the last reply should remove the placeholder too';
  end if;
  raise notice 'PASS comments: removing the last reply removes the placeholder';
end;
$$;

-- Visitors read the comments on published articles, never on drafts. (The
-- owner adds one to the draft to check.)
reset role;
select set_config('request.jwt.claims', '', true);
insert into public.comments (post_id, user_id, body)
values (current_setting('test.draft_id')::uuid, current_setting('test.reader_id')::uuid, 'On a draft (added by the owner)');
set local role anon;

do $$
begin
  if not exists (select 1 from public.comments where post_id = current_setting('test.post_id')::uuid) then
    raise exception 'FAIL: visitors can''t read comments';
  end if;
  if exists (select 1 from public.comments where post_id = current_setting('test.draft_id')::uuid) then
    raise exception 'FAIL: visitors can read comments on a draft';
  end if;
  raise notice 'PASS comments: visitors read comments on published articles, not on drafts';
end;
$$;

-- ─── Newsletter ────────────────────────────────────────────────────────────
-- A test secret, only inside this rolled-back transaction (the real one's
-- hash is put back by the rollback). Visitors' functions need it.
reset role;
select set_config('request.jwt.claims', '', true);
insert into private.newsletter_settings (secret_hash)
values (sha256(convert_to('rls-check-secret', 'UTF8')))
on conflict (id) do update set secret_hash = excluded.secret_hash;
set local role anon;

do $$
declare
  r      record;
  again  record;
begin
  begin
    perform (select count(*) from public.newsletter_subscribers);
    raise exception 'FAIL: visitors can read subscribers';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform (select count(*) from public.newsletter_digests);
    raise exception 'FAIL: visitors can read digests';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.newsletter_subscribe('wrong-secret', 'someone@example.com');
    raise exception 'FAIL: subscribing worked without the secret';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.newsletter_confirm('wrong-secret', gen_random_uuid(), now());
    raise exception 'FAIL: confirming worked without the secret';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.newsletter_unsubscribe('', gen_random_uuid());
    raise exception 'FAIL: unsubscribing worked without the secret';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.newsletter_subscribe_me();
    raise exception 'FAIL: a visitor could call newsletter_subscribe_me()';
  exception when insufficient_privilege then
    null;
  end;
  raise notice 'PASS newsletter: visitors can''t read the tables, and the functions need the server''s secret';

  -- With the secret (as our server calls it).
  select * into r from public.newsletter_subscribe('rls-check-secret', '  Grace.Test@Example.COM ');
  if not r.send_email or r.sent_at is null then raise exception 'FAIL: a new address should get a confirmation email'; end if;
  select * into again from public.newsletter_subscribe('rls-check-secret', 'grace.test@example.com');
  if again.send_email or again.subscriber_id <> r.subscriber_id then
    raise exception 'FAIL: the same address (any case) within a day should get no second email';
  end if;
  begin
    perform public.newsletter_subscribe('rls-check-secret', 'not-an-email');
    raise exception 'FAIL: a malformed address was accepted';
  exception when check_violation then
    null;
  end;
  raise notice 'PASS newsletter: a new address gets one confirmation (any case); malformed ones are refused';

  if public.newsletter_confirm('rls-check-secret', r.subscriber_id, r.sent_at - interval '1 second') then
    raise exception 'FAIL: an older confirmation link worked';
  end if;
  if not public.newsletter_confirm('rls-check-secret', r.subscriber_id, r.sent_at) then
    raise exception 'FAIL: the confirmation link didn''t work';
  end if;
  if not public.newsletter_confirm('rls-check-secret', r.subscriber_id, r.sent_at) then
    raise exception 'FAIL: confirming twice should still say yes';
  end if;
  select * into again from public.newsletter_subscribe('rls-check-secret', 'grace.test@example.com');
  if again.send_email then raise exception 'FAIL: a confirmed address got another confirmation email'; end if;
  raise notice 'PASS newsletter: only the latest confirmation link confirms; confirmed addresses get no more';

  if not public.newsletter_unsubscribe('rls-check-secret', r.subscriber_id) then
    raise exception 'FAIL: unsubscribing didn''t delete the row';
  end if;
  if public.newsletter_unsubscribe('rls-check-secret', r.subscriber_id) then
    raise exception 'FAIL: unsubscribing twice should find nothing';
  end if;
  raise notice 'PASS newsletter: unsubscribing deletes the row';
end;
$$;

-- As the owner: the time rules (24-hour resend, 7-day expiry, hourly cap).
reset role;

do $$
declare
  r      record;
  old_id uuid;
begin
  select * into r from public.newsletter_subscribe('rls-check-secret', 'resend.test@example.com');
  update public.newsletter_subscribers set confirm_sent_at = now() - interval '25 hours' where id = r.subscriber_id;
  select * into r from public.newsletter_subscribe('rls-check-secret', 'resend.test@example.com');
  if not r.send_email then raise exception 'FAIL: after 24 hours a pending address should get a new email'; end if;

  update public.newsletter_subscribers set confirm_sent_at = now() - interval '8 days' where id = r.subscriber_id;
  if public.newsletter_confirm('rls-check-secret', r.subscriber_id, now() - interval '8 days') then
    raise exception 'FAIL: an 8-day-old confirmation link worked';
  end if;
  old_id := r.subscriber_id;
  perform public.newsletter_subscribe('rls-check-secret', 'someone.else@example.com');
  if exists (select 1 from public.newsletter_subscribers where id = old_id) then
    raise exception 'FAIL: a pending sign-up older than 7 days wasn''t cleared';
  end if;
  raise notice 'PASS newsletter: resend after 24 hours; links and pending sign-ups expire after 7 days';

  insert into public.newsletter_subscribers (email, status, source, confirm_sent_at)
  select 'cap' || i || '@example.com', 'pending', 'form', now() from generate_series(1, 20) as i;
  begin
    perform public.newsletter_subscribe('rls-check-secret', 'over.the.cap@example.com');
    raise exception 'FAIL: more than 20 confirmation emails in an hour';
  exception when sqlstate 'PT429' then
    null;
  end;
  delete from public.newsletter_subscribers where email like 'cap%@example.com';
  raise notice 'PASS newsletter: at most 20 confirmation emails an hour';
end;
$$;

-- A signed-in reader: one click, their own account's address.
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.reader_id'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  n int;
begin
  perform public.newsletter_subscribe_me();
  if public.newsletter_my_status() is distinct from 'confirmed' then
    raise exception 'FAIL: subscribing with the account should be confirmed at once';
  end if;
  if exists (select 1 from public.newsletter_subscribers) then
    raise exception 'FAIL: a reader can read subscribers';
  end if;
  delete from public.newsletter_subscribers;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a reader deleted subscribers (undone)'; end if;
  begin
    insert into public.newsletter_digests (covers_from, covers_until) values (now() - interval '7 days', now());
    raise exception 'FAIL: a reader started a digest';
  exception when insufficient_privilege then
    null;
  end;
  perform public.newsletter_unsubscribe_me();
  if public.newsletter_my_status() is not null then raise exception 'FAIL: unsubscribing with the account didn''t work'; end if;
  perform public.newsletter_subscribe_me(); -- again, for the account-deletion check below
  raise notice 'PASS newsletter: readers subscribe and unsubscribe themselves only, and can''t read or touch the tables';
end;
$$;

-- The admin: with the code, reads subscribers and manages digests; without, nothing.
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.admin_id'), 'role', 'authenticated', 'aal', 'aal1')::text, true);

do $$
begin
  if exists (select 1 from public.newsletter_subscribers) then
    raise exception 'FAIL: the admin reads subscribers without the two-factor code';
  end if;
  raise notice 'PASS newsletter: without the two-factor code the admin sees no subscribers';
end;
$$;

select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.admin_id'), 'role', 'authenticated', 'aal', 'aal2')::text, true);

do $$
begin
  if not exists (select 1 from public.newsletter_subscribers where email = 'reader@rls-check.invalid') then
    raise exception 'FAIL: the admin can''t read subscribers';
  end if;
  insert into public.newsletter_digests (covers_from, covers_until) values (now() - interval '7 days', now());
  begin
    insert into public.newsletter_digests (covers_from, covers_until) values (now() - interval '1 day', now());
    raise exception 'FAIL: two digests sending at once';
  exception when unique_violation then
    null;
  end;
  raise notice 'PASS newsletter: the admin reads subscribers and starts a digest; only one digest sends at a time';
end;
$$;

-- As if the reader had subscribed with the form before signing up (no
-- user_id): deleting the account must still remove it, by address.
reset role;
select set_config('request.jwt.claims', '', true);
update public.newsletter_subscribers set user_id = null, source = 'form' where email = 'reader@rls-check.invalid';

-- ─── Deleting the reader's account ─────────────────────────────────────────
reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('test.reader_id'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.delete_my_account();
end;
$$;

reset role;

do $$
declare
  kept uuid := (string_to_array(current_setting('test.old_ids'), ','))[2]::uuid;
begin
  if exists (select 1 from auth.users where id = current_setting('test.reader_id')::uuid)
    or exists (select 1 from public.profiles where id = current_setting('test.reader_id')::uuid) then
    raise exception 'FAIL: delete_my_account() left the account or its profile';
  end if;
  raise notice 'PASS reader: deleting the account removes it and its profile';

  if not exists (select 1 from public.comments
                 where id = kept and user_id is null and deleted_at is null and body <> '') then
    raise exception 'FAIL: a deleted account''s comments should stay, as "deleted user"';
  end if;
  raise notice 'PASS comments: a deleted account''s comments stay, with no author ("deleted user")';

  if exists (select 1 from public.newsletter_subscribers where email = 'reader@rls-check.invalid') then
    raise exception 'FAIL: deleting the account left its newsletter subscription';
  end if;
  raise notice 'PASS newsletter: deleting an account removes its subscription (by address too)';
end;
$$;

-- ─── Guards (as the tables' owner, like the dashboard) ─────────────────────
reset role;

do $$
declare
  t text;
  refused boolean := false;
begin
  foreach t in array array['posts', 'projects', 'books', 'tracks', 'games', 'hobby_items', 'admins', 'profiles', 'comments',
                          'newsletter_subscribers', 'newsletter_digests'] loop
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
