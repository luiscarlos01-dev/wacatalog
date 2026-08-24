create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  name text not null,
  sku text,
  description text not null,
  image_asset_id uuid not null references public.assets (id),
  quantity_available integer not null default 0,
  is_visible boolean not null default false,
  is_orderable boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_not_blank_check check (btrim(name) <> ''),
  constraint products_quantity_available_check check (quantity_available >= 0)
);

create unique index products_store_id_sku_key
  on public.products (store_id, sku)
  where sku is not null;

create function public.set_product_update_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();

  return new;
end;
$$;

create trigger set_product_update_metadata
before update on public.products
for each row
execute function public.set_product_update_metadata();

revoke all on table public.products from anon;
revoke all on table public.products from authenticated;
grant select, insert, update, delete on table public.products to authenticated;

alter table public.products enable row level security;

create policy "store admins can read own store products"
  on public.products
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_memberships
      where store_memberships.store_id = products.store_id
        and store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
    )
  );

create policy "store admins can create own store products"
  on public.products
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.store_memberships
      where store_memberships.store_id = products.store_id
        and store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
    )
  );

create policy "store admins can update own store products"
  on public.products
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.store_memberships
      where store_memberships.store_id = products.store_id
        and store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
    )
  )
  with check (
    exists (
      select 1
      from public.store_memberships
      where store_memberships.store_id = products.store_id
        and store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
    )
  );

create policy "store admins can delete own store products"
  on public.products
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.store_memberships
      where store_memberships.store_id = products.store_id
        and store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
    )
  );
