create table public.hero_banners (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  image_asset_id uuid not null references public.assets (id),
  accessible_description text not null,
  title text,
  text text,
  position integer not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hero_banners_accessible_description_not_blank_check check (
    btrim(accessible_description) <> ''
  ),
  constraint hero_banners_position_check check (position between 1 and 5)
);

-- Enforces unique position only among active banners: a deactivated banner
-- keeps its old position value without blocking a new banner from taking it.
create unique index hero_banners_store_id_position_key
  on public.hero_banners (store_id, position)
  where is_active;

create function public.set_hero_banner_update_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();

  return new;
end;
$$;

create trigger set_hero_banner_update_metadata
before update on public.hero_banners
for each row
execute function public.set_hero_banner_update_metadata();

-- No table grant for `anon`/`authenticated` at all: the public catalog
-- reads this table through a `security definer` function instead
-- (202608250001_public_catalog_access.sql) — a plain table grant would
-- expose every column via the Data API (store_id, image_asset_id,
-- is_active, ...), not just the approved public fields
-- (contract-reviewer finding, feature 003 round 1). Admin-scoped read and
-- write are reserved for a future banner-management feature.
revoke all on table public.hero_banners from anon;
revoke all on table public.hero_banners from authenticated;
-- `service_role` still needs an explicit grant (table privileges are a
-- separate layer from RLS bypass) — it's the only way to seed test banners
-- until that admin feature exists, used by e2e/fixtures/public-catalog.ts.
grant select, insert, delete on table public.hero_banners to service_role;

alter table public.hero_banners enable row level security;
