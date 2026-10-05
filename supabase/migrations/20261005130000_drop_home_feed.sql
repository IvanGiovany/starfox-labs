-- The home page builds its grid from the same loaders as the section pages
-- (Phase 3, step 6), so every card on home is exactly the card on its section
-- page. home_feed, a view made for the home grid before those pages existed,
-- is no longer read by anything. A view holds no data, so dropping it loses
-- nothing; post_items (the "about this" panels) stays.
drop view if exists public.home_feed;
