-- Private bucket for user uploads.
-- Object path convention: {auth.uid()}/<file>  — each user can only touch their own folder.
insert into storage.buckets (id, name, public, file_size_limit)
values ('uploads', 'uploads', false, 52428800) -- 50 MiB
on conflict (id) do nothing;

-- storage.objects has RLS enabled by default; with no policy, every request is denied.
-- These policies open only the caller's own folder to authenticated users.

create policy "uploads: owner can read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "uploads: owner can insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "uploads: owner can update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "uploads: owner can delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
