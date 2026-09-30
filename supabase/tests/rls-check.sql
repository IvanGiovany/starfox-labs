-- Security and rules check for the content tables.
-- Runs as a visitor, then as the admin, inside a transaction that is rolled
-- back at the end, so it changes nothing. Every check prints PASS, or stops
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

  if exists (select 1 from public.home_feed where href like '/writing/%' and href not in (
      select '/writing/' || slug from public.posts)) then
    raise exception 'FAIL: home_feed links to an article visitors cannot see';
  end if;
  raise notice 'PASS visitor: home_feed only links to published articles';
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

  raise notice 'ALL CHECKS PASSED';
end;
$$;

-- Shown as the editor's result. Only reached if every check above passed
-- (any FAIL stops the script before this line).
select 'ALL CHECKS PASSED' as result;

rollback;
