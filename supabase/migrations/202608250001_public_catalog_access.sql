-- specs/003-public-catalog/plan.md assumed public read access to `stores`
-- and `products` already existed from features 001/002. It doesn't (both
-- `revoke all from anon`, only `authenticated` via membership). This
-- migration's first draft closed that gap with a plain
-- `grant select on table ... to anon` — a real security gap the
-- contract-reviewer caught: it exposes every column via the Data API
-- (anyone with the publishable key, which ships in the browser bundle, can
-- call `GET /rest/v1/stores?select=*` directly), not just the ones this
-- feature's own query happens to select — `whatsapp_verification_status`,
-- `created_at`, internal ids, `products.store_id`/`is_active`, none of which
-- are in the approved `PublicCatalog`/`PublicProduct` schema
-- (docs/api/openapi.yaml).
--
-- Column-level grants alone don't fix this: filtering by `store_id` or
-- `is_active`/`is_visible` in the calling query needs the querying role to
-- have SELECT on those columns too, which would still expose them via a
-- direct `select=store_id` call. The actual fix: `anon` gets no direct
-- table access to `stores`/`products` at all (same as `hero_banners`,
-- 202608250000). Instead, three narrow `security definer` functions expose
-- exactly the approved public shape — a caller invoking one of these
-- directly (bypassing this app entirely) gets back only public fields,
-- regardless of what arguments they pass. The storage base URL is passed in
-- as a plain argument (not a secret — it's the same URL already shipped in
-- the browser bundle) so image URLs don't need environment-specific values
-- hardcoded into a migration.

revoke all on table public.stores from anon;
revoke all on table public.products from anon;

create or replace function public.resolve_public_store(p_slug text)
returns table (
  slug text,
  name text,
  whatsapp_available boolean,
  whatsapp_number text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    stores.slug,
    stores.name,
    (stores.whatsapp_number is not null and stores.whatsapp_verification_status = 'verified'),
    stores.whatsapp_number
  from public.stores
  where stores.slug = p_slug;
$$;

revoke all on function public.resolve_public_store(text) from public;
grant execute on function public.resolve_public_store(text) to anon;

create or replace function public.list_public_products(p_store_slug text, p_storage_base_url text)
returns table (
  id uuid,
  name text,
  sku text,
  description text,
  image_url text,
  quantity_available integer,
  is_orderable boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    products.id,
    products.name,
    products.sku,
    products.description,
    p_storage_base_url || '/storage/v1/object/public/catalog-assets/' || products.store_id
      || '/product/' || products.image_asset_id || '.webp',
    products.quantity_available,
    products.is_orderable
  from public.products
  join public.stores on stores.id = products.store_id
  where stores.slug = p_store_slug
    and products.is_active = true
    and products.is_visible = true
  order by products.created_at;
$$;

revoke all on function public.list_public_products(text, text) from public;
grant execute on function public.list_public_products(text, text) to anon;

create or replace function public.list_public_hero_banners(p_store_slug text, p_storage_base_url text)
returns table (
  id uuid,
  image_url text,
  accessible_description text,
  title text,
  banner_text text,
  "position" integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    hero_banners.id,
    p_storage_base_url || '/storage/v1/object/public/catalog-assets/' || hero_banners.store_id
      || '/banner/' || hero_banners.image_asset_id || '.webp',
    hero_banners.accessible_description,
    hero_banners.title,
    hero_banners.text,
    hero_banners.position
  from public.hero_banners
  join public.stores on stores.id = hero_banners.store_id
  where stores.slug = p_store_slug
    and hero_banners.is_active = true
  order by hero_banners.position;
$$;

revoke all on function public.list_public_hero_banners(text, text) from public;
grant execute on function public.list_public_hero_banners(text, text) to anon;
