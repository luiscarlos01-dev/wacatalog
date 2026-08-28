begin;

select plan(5);

-- catalog-import-uploads bucket (ADR-0008) -----------------------------------

select ok(
  exists (
    select 1
    from storage.buckets
    where id = 'catalog-import-uploads'
      and public = false
      and file_size_limit = 52428800
      and allowed_mime_types = array['application/pdf']
  ),
  'catalog-import-uploads bucket is private with the approved size/type limits'
);

-- Unlike the weaker precedent for `asset-uploads`/`catalog-assets` (name and
-- count only), these also assert the predicate scopes the policy to the
-- authenticated administrator's own store folder segment — a policy could
-- otherwise keep its name and count while its `qual`/`with_check` was
-- silently loosened to `true` (see memory: pgtap-storage-policy-so-checa-nome).
select ok(
  (
    select count(*) = 1
      and bool_and(
        cmd = 'INSERT'
        and roles = array['authenticated']::name[]
        and with_check like '%catalog-import-uploads%'
        and with_check like '%store_memberships%'
        and with_check like '%auth.uid()%'
        and with_check like '%store_admin%'
        and with_check like '%storage.foldername(objects.name)%'
      )
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'store admins can upload own store catalog import pdfs'
  ),
  'catalog-import-uploads has exactly one upload policy, scoped to the caller''s own store folder'
);

select ok(
  (
    select count(*) = 1
      and bool_and(
        cmd = 'SELECT'
        and roles = array['authenticated']::name[]
        and qual like '%catalog-import-uploads%'
        and qual like '%store_memberships%'
        and qual like '%auth.uid()%'
        and qual like '%store_admin%'
        and qual like '%storage.foldername(objects.name)%'
      )
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'store admins can read own store catalog import pdfs'
  ),
  'catalog-import-uploads has exactly one read policy, scoped to the caller''s own store folder (private bucket: the server must download the PDF)'
);

select ok(
  (
    select count(*) = 1
      and bool_and(
        cmd = 'DELETE'
        and roles = array['authenticated']::name[]
        and qual like '%catalog-import-uploads%'
        and qual like '%store_memberships%'
        and qual like '%auth.uid()%'
        and qual like '%store_admin%'
        and qual like '%storage.foldername(objects.name)%'
      )
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'store admins can delete own store catalog import pdfs'
  ),
  'catalog-import-uploads has exactly one delete policy, scoped to the caller''s own store folder'
);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'UPDATE'
      and policyname like '%catalog import pdfs%'
  ),
  'catalog-import-uploads has no replace policy (client always uploads with upsert: false)'
);

select * from finish();
rollback;
