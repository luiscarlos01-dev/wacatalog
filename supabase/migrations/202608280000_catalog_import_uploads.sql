-- catalog-import-uploads: private bucket for the PDF catalog the browser
-- uploads directly to Storage, bypassing the Vercel Function 4.5 MB body
-- limit (ADR-0008). Never public: the content is a raw customer file, not a
-- published asset. Path convention enforced by the application, never by the
-- client: {storeId}/{uuid}.pdf. The server removes the object after
-- processing, success or failure (ADR-0008 rule 5).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-import-uploads',
  'catalog-import-uploads',
  false,
  52428800,
  array['application/pdf']
)
on conflict (id) do nothing;

create policy "store admins can upload own store catalog import pdfs"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'catalog-import-uploads'
    and exists (
      select 1
      from public.store_memberships
      where store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
        and store_memberships.store_id::text = (storage.foldername(name))[1]
    )
  );

create policy "store admins can read own store catalog import pdfs"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'catalog-import-uploads'
    and exists (
      select 1
      from public.store_memberships
      where store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
        and store_memberships.store_id::text = (storage.foldername(name))[1]
    )
  );

create policy "store admins can delete own store catalog import pdfs"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'catalog-import-uploads'
    and exists (
      select 1
      from public.store_memberships
      where store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
        and store_memberships.store_id::text = (storage.foldername(name))[1]
    )
  );
