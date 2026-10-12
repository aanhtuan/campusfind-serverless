begin;

-- This migration defines local/future bucket metadata; it does not upload files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- Supabase owns storage.objects and its grants/RLS setup. Add only bucket-scoped
-- policies; never replace global Storage grants or modify Storage internals.
create policy campusfind_images_upload on storage.objects for insert to authenticated
with check (
  bucket_id = 'item-images'
  and owner_id = (select auth.uid()::text)
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  and split_part(name, '/', 1) = (select auth.uid()::text)
  and exists (select 1 from public.items i
    where i.id::text = split_part(name, '/', 2) and i.reporter_id = (select auth.uid()))
);

create policy campusfind_images_read on storage.objects for select to authenticated
using (
  bucket_id = 'item-images' and (
    -- The reporter may preview and remove an upload before registering metadata.
    exists (select 1 from public.items i where i.id::text = split_part(name, '/', 2)
      and i.reporter_id = (select auth.uid()) and i.reporter_id::text = split_part(name, '/', 1))
    or exists (select 1 from public.item_images im where im.storage_path = name)
  )
);

create policy campusfind_images_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'item-images'
  and split_part(name, '/', 1) = (select auth.uid()::text)
  and exists (select 1 from public.items i where i.id::text = split_part(name, '/', 2)
    and i.reporter_id = (select auth.uid()))
);

-- No anon read policy and no UPDATE policy: private downloads require a user
-- session; overwrite/upsert/move is deliberately unavailable through the client.
commit;
