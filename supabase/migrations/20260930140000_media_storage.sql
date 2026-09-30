-- Storage for uploaded images and audio snippets: one public bucket, "media".
--
-- Public bucket: anyone can load a file by its URL (needed for the site), but
-- nobody except the admin can list, upload, replace or delete files.
-- Folders: writing/, projects/, books/, music/ (covers + snippets), games/, hobbies/.
--
-- Limits are enforced by Storage itself, whatever the browser sends:
--   5 MB per file (images are resized in the browser first; snippets are ~0.5 MB)
--   images: JPEG, PNG, WebP, AVIF; audio: MP3, M4A

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a']
)
on conflict (id) do nothing;

-- The admin can see the bucket's files (needed for replacing/upserting),
-- upload, replace and delete. There's deliberately no read policy for
-- visitors: public URLs work without one, and listing stays private.
create policy "Admins can list media"
  on storage.objects for select to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

create policy "Admins can upload media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy "Admins can replace media"
  on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy "Admins can delete media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
