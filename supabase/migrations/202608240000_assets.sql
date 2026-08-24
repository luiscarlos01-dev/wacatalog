create table public.assets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  storage_path text not null unique,
  content_type text not null,
  byte_size integer not null,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  constraint assets_content_type_check check (content_type = 'image/webp'),
  constraint assets_byte_size_check check (byte_size > 0)
);

alter table public.assets enable row level security;

revoke all on table public.assets from anon;
revoke all on table public.assets from authenticated;
grant select, insert, delete on table public.assets to authenticated;

create policy "store admins can read own store assets"
  on public.assets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_memberships
      where store_memberships.store_id = assets.store_id
        and store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
    )
  );

create policy "store admins can create own store assets"
  on public.assets
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.store_memberships
      where store_memberships.store_id = assets.store_id
        and store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
    )
  );

create policy "store admins can delete own store assets"
  on public.assets
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.store_memberships
      where store_memberships.store_id = assets.store_id
        and store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
    )
  );

-- catalog-assets: single public-read bucket for normalized product/banner
-- images (ADR-0003 rule 5, research.md). Path convention enforced by the
-- application, never by the client: {storeId}/{kind}/{assetId}.webp.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-assets', 'catalog-assets', true, 10485760, array['image/webp'])
on conflict (id) do nothing;

create policy "store admins can upload own store catalog assets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'catalog-assets'
    and exists (
      select 1
      from public.store_memberships
      where store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
        and store_memberships.store_id::text = (storage.foldername(name))[1]
    )
  );

create policy "store admins can delete own store catalog assets"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'catalog-assets'
    and exists (
      select 1
      from public.store_memberships
      where store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
        and store_memberships.store_id::text = (storage.foldername(name))[1]
    )
  );
