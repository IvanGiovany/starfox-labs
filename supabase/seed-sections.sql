-- SAMPLE CONTENT for building and reviewing the section pages (Phase 3).
-- Not real entries. Every sample row has an id starting with
-- 00000000-0000-4000-8000-, and the sample articles have slugs starting with
-- "sample-", so they're easy to remove before launch:
--
--   delete from public.projects    where id::text like '00000000-0000-4000-8000-%';
--   delete from public.books       where id::text like '00000000-0000-4000-8000-%';
--   delete from public.tracks      where id::text like '00000000-0000-4000-8000-%';
--   delete from public.games       where id::text like '00000000-0000-4000-8000-%';
--   delete from public.hobby_items where id::text like '00000000-0000-4000-8000-%';
--   delete from public.posts       where slug like 'sample-%';
--
-- Safe to re-run: it removes its own rows first. No images or audio files are
-- included (image_path is empty; the sample song's snippet path points to a
-- file that doesn't exist yet).

delete from public.projects    where id::text like '00000000-0000-4000-8000-%';
delete from public.books       where id::text like '00000000-0000-4000-8000-%';
delete from public.tracks      where id::text like '00000000-0000-4000-8000-%';
delete from public.games       where id::text like '00000000-0000-4000-8000-%';
delete from public.hobby_items where id::text like '00000000-0000-4000-8000-%';
delete from public.posts where slug in ('sample-review-hollow-knight', 'sample-song-night-drive', 'sample-notes-pragmatic-programmer');

-- Articles the sample items link to.
insert into public.posts (id, slug, title, summary, tags, status, published_at, body_md) values
('00000000-0000-4000-8000-000000000101', 'sample-review-hollow-knight',
 'Sample review: Hollow Knight',
 'A placeholder game review, to test how reviews link to their game card.',
 array['games'], 'published', now() - interval '6 days',
 $md$This is a **sample review** used while building the Games section. Delete it before launch.$md$),
('00000000-0000-4000-8000-000000000102', 'sample-song-night-drive',
 'Sample song notes: Night Drive',
 'A placeholder song article, to test the audio snippet panel.',
 array['music'], 'published', now() - interval '12 days',
 $md$This is a **sample song article** used while building the Music section. Delete it before launch.$md$),
('00000000-0000-4000-8000-000000000103', 'sample-notes-pragmatic-programmer',
 'Sample notes: The Pragmatic Programmer',
 'A placeholder book write-up, to test how articles link to book cards.',
 array['books'], 'published', now() - interval '20 days',
 $md$This is a **sample book write-up** used while building the Reading section. Delete it before launch.$md$);

insert into public.projects (id, title, status, card_size, show_on_home, sort_order, summary, url, repo_url, stack) values
('00000000-0000-4000-8000-000000000201', 'Sample: Pixel Racer', 'published', 'wide', true, 1,
 'A placeholder browser game project.', 'https://example.com/pixel-racer', 'https://github.com/example/pixel-racer', array['TypeScript', 'Canvas']),
('00000000-0000-4000-8000-000000000202', 'Sample: Terminal Toolkit', 'published', 'small', false, 2,
 'A placeholder project with only a repo link.', null, 'https://github.com/example/terminal-toolkit', array['Rust']),
('00000000-0000-4000-8000-000000000203', 'Sample: Weather Widget', 'draft', 'small', false, 3,
 'A placeholder draft project (not visible to visitors).', null, null, array['React']);

insert into public.books (id, title, author, reading_status, status, show_on_home, sort_order, rating, started_on, finished_on, post_id, isbn, published_year) values
('00000000-0000-4000-8000-000000000301', 'The Design of Everyday Things', 'Don Norman', 'reading', 'published', true, 1, null, current_date - 10, null, null, '9780465050659', 2013),
('00000000-0000-4000-8000-000000000302', 'The Pragmatic Programmer', 'David Thomas, Andrew Hunt', 'read', 'published', false, 2, 5, current_date - 90, current_date - 25,
 '00000000-0000-4000-8000-000000000103', '9780135957059', 2019),
('00000000-0000-4000-8000-000000000303', 'Thinking, Fast and Slow', 'Daniel Kahneman', 'read', 'published', false, 3, 4, null, current_date - 200, null, null, 2011),
('00000000-0000-4000-8000-000000000304', 'Dune', 'Frank Herbert', 'read', 'published', false, 4, 5, null, current_date - 400, null, null, 1965),
('00000000-0000-4000-8000-000000000305', 'Project Hail Mary', 'Andy Weir', 'to_read', 'published', false, 5, null, null, null, null, null, 2021);

insert into public.tracks (id, title, status, in_progress, show_on_home, sort_order, released_on, post_id, snippet_path, full_track_url) values
('00000000-0000-4000-8000-000000000401', 'Night Drive (sample)', 'published', false, false, 1, current_date - 12,
 '00000000-0000-4000-8000-000000000102', 'music/sample-night-drive.mp3', 'https://example.com/night-drive'),
('00000000-0000-4000-8000-000000000402', 'Untitled sketch (sample)', 'published', true, true, 2, null, null, null, null);

insert into public.games (id, title, status, show_on_home, sort_order, platform, hours_played, rating, play_status, finished_on, post_id) values
('00000000-0000-4000-8000-000000000501', 'Hollow Knight (sample)', 'published', true, 1, 'Nintendo Switch', 62.5, 9, 'finished', current_date - 6,
 '00000000-0000-4000-8000-000000000101'),
('00000000-0000-4000-8000-000000000502', 'Celeste (sample)', 'draft', false, 2, 'PC', 8, null, 'playing', null, null);

insert into public.hobby_items (id, title, status, category, subtitle, note, image_style, badges, show_on_home, sort_order) values
('00000000-0000-4000-8000-000000000601', 'Ethiopia Guji (sample)', 'published', 'Coffee', 'Ethiopia · Sample Roasters', 'Blueberry, jasmine and honey', 'none', array['Filter', 'Now brewing'], true, 1),
('00000000-0000-4000-8000-000000000602', 'Colombia Huila (sample)', 'published', 'Coffee', 'Colombia · Sample Roasters', 'Red apple and cane sugar', 'none', array['Espresso'], false, 2),
('00000000-0000-4000-8000-000000000603', 'Monstera (sample)', 'published', 'Plants', 'Araceae', 'Survived two moves', 'cutout', array['Araceae'], false, 3),
('00000000-0000-4000-8000-000000000604', 'Next.js 16 (sample)', 'published', 'Learning', 'Cache Components · Row Level Security', null, 'none', array['Learning'], true, 4);
