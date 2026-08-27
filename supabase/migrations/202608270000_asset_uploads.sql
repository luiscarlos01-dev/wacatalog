-- asset-uploads: private bucket for the raw image the browser uploads
-- directly to Storage, bypassing the Vercel Function 4.5 MB body limit
-- (ADR-0009). Unlike catalog-assets, never public: the content is an
-- unnormalized original, not a published asset. Path convention enforced
-- by the application, never by the client: {storeId}/{uuid}. The server
-- removes the object after processing, success or failure (ADR-0009 rule 4).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'asset-uploads',
  'asset-uploads',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy "store admins can upload own store raw asset uploads"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'asset-uploads'
    and exists (
      select 1
      from public.store_memberships
      where store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
        and store_memberships.store_id::text = (storage.foldername(name))[1]
    )
  );

create policy "store admins can read own store raw asset uploads"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'asset-uploads'
    and exists (
      select 1
      from public.store_memberships
      where store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
        and store_memberships.store_id::text = (storage.foldername(name))[1]
    )
  );

create policy "store admins can delete own store raw asset uploads"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'asset-uploads'
    and exists (
      select 1
      from public.store_memberships
      where store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
        and store_memberships.store_id::text = (storage.foldername(name))[1]
    )
  );
