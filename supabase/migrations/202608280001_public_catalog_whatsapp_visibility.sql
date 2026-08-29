-- specs/005-whatsapp-store-config/contracts/whatsapp-store-config.md, achado
-- L-1 (contract-reviewer): `resolve_public_store`
-- (202608250001_public_catalog_access.sql, feature 003) returned
-- `whatsapp_number` unconditionally, leaking a configured-but-unverified
-- number through the public catalog. `whatsapp_available` was already
-- correct (`whatsapp_number is not null and status = 'verified'`); only the
-- raw number was missing the same check. Fixed via `create or replace
-- function` — never editing the already-merged 202608250001 migration.
-- `create or replace function` preserves the function's existing identity
-- and grants (`revoke all ... from public` / `grant execute ... to anon`
-- from the original migration still apply), so they are not repeated here.

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
    case when stores.whatsapp_verification_status = 'verified' then stores.whatsapp_number end
  from public.stores
  where stores.slug = p_slug;
$$;
