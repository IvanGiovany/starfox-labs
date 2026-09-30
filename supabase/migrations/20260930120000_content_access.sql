-- Who can do what with the section tables.
--   Visitors (publishable key, signed in or not): read published rows only.
--   The admin: everything.
-- With RLS on, anything not allowed by a policy is refused.
--
-- Note: a published song or game needs its article, so deleting that article
-- is refused until the item is unpublished (the `on delete set null` would
-- break the item's rule). The admin explains this when it happens.

do $$
declare
  t text;
begin
  foreach t in array array['projects', 'books', 'tracks', 'games', 'hobby_items'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy "Published %1$s are readable by everyone" on public.%1$I
         for select to anon, authenticated
         using (status = ''published'')', t);

    execute format(
      'create policy "Admins can read all %1$s" on public.%1$I
         for select to authenticated
         using ((select public.is_admin()))', t);

    execute format(
      'create policy "Admins can create %1$s" on public.%1$I
         for insert to authenticated
         with check ((select public.is_admin()))', t);

    execute format(
      'create policy "Admins can edit %1$s" on public.%1$I
         for update to authenticated
         using ((select public.is_admin()))
         with check ((select public.is_admin()))', t);

    execute format(
      'create policy "Admins can delete %1$s" on public.%1$I
         for delete to authenticated
         using ((select public.is_admin()))', t);

    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;
end;
$$;

-- Drag-to-reorder in the admin: save a whole section's order in one call.
-- `ids` is the new order, first card first. Runs with the caller's own
-- permissions (security invoker), so RLS still applies: a visitor calling it
-- changes nothing, and it also refuses outright.
create function public.reorder_items(section text, ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can reorder items.' using errcode = 'insufficient_privilege';
  end if;
  if section not in ('projects', 'books', 'tracks', 'games', 'hobby_items') then
    raise exception 'Unknown section: %', section using errcode = 'invalid_parameter_value';
  end if;

  execute format(
    'update public.%I as item
        set sort_order = new_order.position
       from unnest($1) with ordinality as new_order (id, position)
      where item.id = new_order.id', section)
  using ids;
end;
$$;

revoke all on function public.reorder_items(text, uuid[]) from public;
grant execute on function public.reorder_items(text, uuid[]) to authenticated;
