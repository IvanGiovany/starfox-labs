-- Let the admin manage articles, and make publishing harder to get wrong.
-- Visitors keep the existing rule: they only ever see published posts.

-- Admin permissions. `(select public.is_admin())` is evaluated once per query
-- instead of once per row, as Supabase recommends for RLS performance.
create policy "Admins can read all posts"
  on public.posts for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can create posts"
  on public.posts for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can edit posts"
  on public.posts for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete posts"
  on public.posts for delete to authenticated
  using ((select public.is_admin()));

-- Table-level permission for signed-in users; the policies above still
-- restrict every write to admins.
grant insert, update, delete on public.posts to authenticated;

-- A published article must have a body. (The summary is optional: the site
-- falls back to the first sentence.)
alter table public.posts
  add constraint published_posts_have_body
  check (status = 'draft' or length(trim(body_md)) > 0);

-- Publishing fills in the publish date if it's missing, so the editor can't
-- forget it. An existing date is kept (e.g. when re-publishing).
create function public.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create trigger posts_set_published_at
  before insert or update on public.posts
  for each row execute function public.set_published_at();
