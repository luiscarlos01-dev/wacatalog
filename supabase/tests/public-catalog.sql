begin;

select plan(31);

-- hero_banners: structure -----------------------------------------------------

select ok(to_regclass('public.hero_banners') is not null, 'hero_banners exists');

select is(
  (
    select array_agg(
      format(
        '%s:%s:%s',
        attname,
        format_type(atttypid, atttypmod),
        case when attnotnull then 'required' else 'optional' end
      )
      order by attnum
    )
    from pg_attribute
    where attrelid = 'public.hero_banners'::regclass
      and attnum > 0
      and not attisdropped
  ),
  array[
    'id:uuid:required',
    'store_id:uuid:required',
    'image_asset_id:uuid:required',
    'accessible_description:text:required',
    'title:text:optional',
    'text:text:optional',
    'position:integer:required',
    'is_active:boolean:required',
    'created_at:timestamp with time zone:required',
    'updated_at:timestamp with time zone:required'
  ],
  'hero_banners has exactly the approved fields, types and nullability'
);

select ok(
  (
    select count(*) = 4
      and bool_and(
        case attname
          when 'id' then expression = 'gen_random_uuid()'
          when 'is_active' then expression = 'false'
          when 'created_at' then expression = 'now()'
          when 'updated_at' then expression = 'now()'
          else false
        end
      )
    from (
      select attribute.attname, pg_get_expr(default_value.adbin, default_value.adrelid) as expression
      from pg_attribute as attribute
      join pg_attrdef as default_value
        on default_value.adrelid = attribute.attrelid
        and default_value.adnum = attribute.attnum
      where attribute.attrelid = 'public.hero_banners'::regclass
    ) as hero_banner_defaults
  ),
  'hero_banners has only the approved defaults'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.hero_banners'::regclass
      and conname = 'hero_banners_accessible_description_not_blank_check'
  ),
  'hero_banners rejects a blank accessible_description'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.hero_banners'::regclass
      and conname = 'hero_banners_position_check'
      and pg_get_constraintdef(oid) like '%"position" >= 1%'
      and pg_get_constraintdef(oid) like '%"position" <= 5%'
  ),
  'hero_banners position is between 1 and 5'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'hero_banners'
      and indexname = 'hero_banners_store_id_position_key'
      and indexdef like '%WHERE is_active%'
  ),
  'hero_banners position is unique per store only among active banners'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.hero_banners'::regclass
      and contype = 'f'
      and confrelid = 'public.stores'::regclass
  ),
  'hero_banners references stores'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.hero_banners'::regclass
      and contype = 'f'
      and confrelid = 'public.assets'::regclass
  ),
  'hero_banners references assets'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.hero_banners'::regclass
      and tgname = 'set_hero_banner_update_metadata'
      and tgenabled = 'O'
      and not tgisinternal
  ),
  'hero_banners update trigger is enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.hero_banners'::regclass),
  'RLS is enabled for hero_banners'
);

-- Direct table access (feature 003 round 1 finding): a plain table grant
-- exposes every column via the Data API, not just the ones the public
-- catalog's own query happens to select. `anon`/`authenticated` get zero
-- table privilege on `hero_banners` — the public catalog reads it through
-- `list_public_hero_banners` (below) instead.
select ok(
  not has_table_privilege('anon', 'public.hero_banners', 'SELECT,INSERT,UPDATE,DELETE'),
  'anonymous users receive no hero_banners table privilege'
);

select ok(
  not has_table_privilege('authenticated', 'public.hero_banners', 'SELECT,INSERT,UPDATE,DELETE'),
  'authenticated users receive no hero_banners privilege in this feature'
);

-- Table privileges are a separate layer from RLS bypass — service_role
-- still needs an explicit grant to seed test banners (no admin UI exists
-- yet), used by e2e/fixtures/public-catalog.ts.
select ok(
  has_table_privilege('service_role', 'public.hero_banners', 'SELECT,INSERT,DELETE')
  and not has_table_privilege('service_role', 'public.hero_banners', 'UPDATE'),
  'service_role can seed and remove hero_banners, but not update them'
);

-- public catalog: security definer functions -----------------------------------
-- (202608250001_public_catalog_access.sql). Each function's return columns
-- are asserted exactly, not just "has execute" — a `returns table` shape is
-- fixed by the function signature, so this is what actually prevents a
-- column from silently being added back (the round-1 finding).

select ok(
  has_function_privilege('anon', 'public.resolve_public_store(text)', 'EXECUTE')
  and not has_function_privilege('public', 'public.resolve_public_store(text)', 'EXECUTE'),
  'only anon (not the default PUBLIC role) may call resolve_public_store'
);

select ok(
  has_function_privilege('anon', 'public.list_public_products(text, text)', 'EXECUTE')
  and not has_function_privilege('public', 'public.list_public_products(text, text)', 'EXECUTE'),
  'only anon (not the default PUBLIC role) may call list_public_products'
);

select ok(
  has_function_privilege('anon', 'public.list_public_hero_banners(text, text)', 'EXECUTE')
  and not has_function_privilege('public', 'public.list_public_hero_banners(text, text)', 'EXECUTE'),
  'only anon (not the default PUBLIC role) may call list_public_hero_banners'
);

select is(
  (
    select array_agg(arg.name order by arg.ord)
    from pg_proc,
      lateral unnest(proargnames, proargmodes) with ordinality as arg(name, mode, ord)
    where proname = 'resolve_public_store'
      and pronamespace = 'public'::regnamespace
      and arg.mode = 't'
  ),
  array['slug', 'name', 'whatsapp_available', 'whatsapp_number'],
  'resolve_public_store returns exactly the approved PublicCatalog.store fields'
);

select is(
  (
    select array_agg(arg.name order by arg.ord)
    from pg_proc,
      lateral unnest(proargnames, proargmodes) with ordinality as arg(name, mode, ord)
    where proname = 'list_public_products'
      and pronamespace = 'public'::regnamespace
      and arg.mode = 't'
  ),
  array['id', 'name', 'sku', 'description', 'image_url', 'quantity_available', 'is_orderable'],
  'list_public_products returns exactly the approved PublicProduct fields'
);

select is(
  (
    select array_agg(arg.name order by arg.ord)
    from pg_proc,
      lateral unnest(proargnames, proargmodes) with ordinality as arg(name, mode, ord)
    where proname = 'list_public_hero_banners'
      and pronamespace = 'public'::regnamespace
      and arg.mode = 't'
  ),
  array['id', 'image_url', 'accessible_description', 'title', 'banner_text', 'position'],
  'list_public_hero_banners returns exactly the approved PublicBanner fields'
);

-- functional: fixtures ----------------------------------------------------------

insert into public.stores (id, slug, name)
values
  ('10000000-0000-4000-8000-000000000001', 'store-a', 'Store A'),
  ('10000000-0000-4000-8000-000000000002', 'store-b', 'Store B');

insert into public.stores (
  id, slug, name, whatsapp_number, whatsapp_verification_status, whatsapp_verified_at
)
values (
  '10000000-0000-4000-8000-000000000003',
  'store-c-verified',
  'Store C',
  '5511999999999',
  'verified',
  now()
);

-- 005-whatsapp-store-config, achado L-1: a number configured but never
-- confirmed (`whatsapp_verification_status` left at its default
-- 'unverified') must never leak through the public catalog.
insert into public.stores (id, slug, name, whatsapp_number)
values (
  '10000000-0000-4000-8000-000000000004',
  'store-d-unverified-number',
  'Store D',
  '5511988887777'
);

insert into public.assets (id, store_id, storage_path, content_type, byte_size, width, height)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001/banner/40000000-0000-4000-8000-000000000001.webp',
    'image/webp',
    12345,
    1600,
    600
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001/banner/40000000-0000-4000-8000-000000000002.webp',
    'image/webp',
    12345,
    1600,
    600
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002/banner/40000000-0000-4000-8000-000000000003.webp',
    'image/webp',
    12345,
    1600,
    600
  );

insert into public.hero_banners (id, store_id, image_asset_id, accessible_description, position, is_active)
values
  (
    '60000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'Banner ativo 1 da Store A',
    2,
    true
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000002',
    'Banner inativo da Store A',
    1,
    false
  ),
  (
    '60000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000003',
    'Banner ativo da Store B',
    1,
    true
  );

select throws_ok(
  $$
    insert into public.hero_banners (store_id, image_asset_id, accessible_description, position, is_active)
    values (
      '10000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001',
      'Duplicate active position',
      2,
      true
    )
  $$,
  '23505',
  null,
  'hero_banners rejects a second active banner at an already-taken position for the same store'
);

select lives_ok(
  $$
    insert into public.hero_banners (store_id, image_asset_id, accessible_description, position, is_active)
    values (
      '10000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001',
      'Inactive banner reusing an active position',
      2,
      false
    )
  $$,
  'hero_banners allows an inactive banner to reuse a position already active for another banner'
);

select throws_ok(
  $$ insert into public.hero_banners (store_id, image_asset_id, accessible_description, position) values ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Out of range', 6) $$,
  '23514',
  null,
  'hero_banners rejects a position outside 1-5'
);

insert into public.products (
  id,
  store_id,
  name,
  description,
  image_asset_id,
  is_visible
)
values (
  '50000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Published product',
  'Visible to the public catalog',
  '40000000-0000-4000-8000-000000000001',
  true
);

-- functional: security definer functions, as anon --------------------------------

set local role anon;

select results_eq(
  $$ select id from public.list_public_hero_banners('store-a', 'http://localhost') $$,
  $$ values ('60000000-0000-4000-8000-000000000001'::uuid) $$,
  'list_public_hero_banners returns only the active banner for the requested store'
);

select results_eq(
  $$ select id from public.list_public_hero_banners('store-b', 'http://localhost') $$,
  $$ values ('60000000-0000-4000-8000-000000000003'::uuid) $$,
  'list_public_hero_banners scopes by store, never mixing in another store''s banner'
);

select results_eq(
  $$ select id from public.list_public_products('store-a', 'http://localhost') $$,
  $$ values ('50000000-0000-4000-8000-000000000001'::uuid) $$,
  'list_public_products returns a published (active and visible) product for the requested store'
);

select is_empty(
  $$ select id from public.list_public_products('store-b', 'http://localhost') $$,
  'list_public_products returns nothing for a store with no published products'
);

select results_eq(
  $$ select slug, name from public.resolve_public_store('store-a') $$,
  $$ values ('store-a'::text, 'Store A'::text) $$,
  'resolve_public_store resolves an existing store by slug'
);

select is_empty(
  $$ select slug from public.resolve_public_store('store-does-not-exist') $$,
  'resolve_public_store returns nothing for an unknown slug'
);

select results_eq(
  $$ select whatsapp_available, whatsapp_number from public.resolve_public_store('store-a') $$,
  $$ values (false, null::text) $$,
  'resolve_public_store marks whatsapp unavailable for a store with no number'
);

select results_eq(
  $$ select whatsapp_available, whatsapp_number from public.resolve_public_store('store-c-verified') $$,
  $$ values (true, '5511999999999'::text) $$,
  'resolve_public_store marks whatsapp available only once verified with a number'
);

-- 005-whatsapp-store-config, achado L-1 (contract-reviewer): a number
-- configured but never confirmed must come back null, not the raw digits —
-- this would have passed both before and after the fix without this
-- specific assertion (whatsapp_available was already correctly false here).
select results_eq(
  $$ select whatsapp_available, whatsapp_number from public.resolve_public_store('store-d-unverified-number') $$,
  $$ values (false, null::text) $$,
  'resolve_public_store never returns a configured-but-unverified number'
);

reset role;

select * from finish();
rollback;
