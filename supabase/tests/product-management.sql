begin;

select plan(42);

-- assets: structure ---------------------------------------------------------

select ok(to_regclass('public.assets') is not null, 'assets exists');

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
    where attrelid = 'public.assets'::regclass
      and attnum > 0
      and not attisdropped
  ),
  array[
    'id:uuid:required',
    'store_id:uuid:required',
    'storage_path:text:required',
    'content_type:text:required',
    'byte_size:integer:required',
    'width:integer:optional',
    'height:integer:optional',
    'created_at:timestamp with time zone:required'
  ],
  'assets has exactly the approved fields, types and nullability'
);

select ok(
  (
    select count(*) = 2
      and bool_and(
        case attname
          when 'id' then expression = 'gen_random_uuid()'
          when 'created_at' then expression = 'now()'
          else false
        end
      )
    from (
      select attribute.attname, pg_get_expr(default_value.adbin, default_value.adrelid) as expression
      from pg_attribute as attribute
      join pg_attrdef as default_value
        on default_value.adrelid = attribute.attrelid
        and default_value.adnum = attribute.attnum
      where attribute.attrelid = 'public.assets'::regclass
    ) as asset_defaults
  ),
  'assets has only the approved defaults'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.assets'::regclass
      and contype = 'u'
      and conkey = array[
        (select attnum from pg_attribute where attrelid = 'public.assets'::regclass and attname = 'storage_path')
      ]::smallint[]
  ),
  'asset storage_path is unique'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.assets'::regclass
      and conname = 'assets_content_type_check'
      and pg_get_constraintdef(oid) like '%image/webp%'
  ),
  'asset content_type is restricted to the normalized format'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.assets'::regclass
      and conname = 'assets_byte_size_check'
      and pg_get_constraintdef(oid) like '%byte_size > 0%'
  ),
  'asset byte_size must be positive'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.assets'::regclass
      and contype = 'f'
      and confrelid = 'public.stores'::regclass
  ),
  'assets references stores'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.assets'::regclass),
  'RLS is enabled for assets'
);

select ok(
  has_table_privilege('authenticated', 'public.assets', 'SELECT,INSERT,DELETE'),
  'authenticated users receive the assets read/create/delete privilege'
);

select ok(
  not has_table_privilege('authenticated', 'public.assets', 'UPDATE'),
  'authenticated users receive no assets update privilege'
);

select ok(
  not has_table_privilege('anon', 'public.assets', 'SELECT,INSERT,UPDATE,DELETE'),
  'anonymous users receive no assets privilege'
);

-- products: structure --------------------------------------------------------

select ok(to_regclass('public.products') is not null, 'products exists after assets');

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
    where attrelid = 'public.products'::regclass
      and attnum > 0
      and not attisdropped
  ),
  array[
    'id:uuid:required',
    'store_id:uuid:required',
    'name:text:required',
    'sku:text:optional',
    'description:text:required',
    'image_asset_id:uuid:required',
    'quantity_available:integer:required',
    'is_visible:boolean:required',
    'is_orderable:boolean:required',
    'is_active:boolean:required',
    'created_at:timestamp with time zone:required',
    'updated_at:timestamp with time zone:required'
  ],
  'products has exactly the approved fields, types and nullability'
);

select ok(
  (
    select count(*) = 7
      and bool_and(
        case attname
          when 'id' then expression = 'gen_random_uuid()'
          when 'quantity_available' then expression = '0'
          when 'is_visible' then expression = 'false'
          when 'is_orderable' then expression = 'false'
          when 'is_active' then expression = 'true'
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
      where attribute.attrelid = 'public.products'::regclass
    ) as product_defaults
  ),
  'products has only the approved defaults'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and conname = 'products_name_not_blank_check'
  ),
  'products rejects a blank name'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and conname = 'products_quantity_available_check'
      and pg_get_constraintdef(oid) like '%quantity_available >= 0%'
  ),
  'products quantity_available cannot be negative'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'products'
      and indexname = 'products_store_id_sku_key'
      and indexdef like '%WHERE (sku IS NOT NULL)%'
  ),
  'products SKU is unique per store only when present'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and contype = 'f'
      and confrelid = 'public.stores'::regclass
  ),
  'products references stores'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and contype = 'f'
      and confrelid = 'public.assets'::regclass
  ),
  'products references assets'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.products'::regclass
      and tgname = 'set_product_update_metadata'
      and tgenabled = 'O'
      and not tgisinternal
  ),
  'products update trigger is enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.products'::regclass),
  'RLS is enabled for products'
);

select ok(
  has_table_privilege('authenticated', 'public.products', 'SELECT,INSERT,UPDATE,DELETE'),
  'authenticated users receive the full products privilege set'
);

select ok(
  not has_table_privilege('anon', 'public.products', 'SELECT,INSERT,UPDATE,DELETE'),
  'anonymous users receive no products privilege'
);

-- catalog-assets bucket -------------------------------------------------------

select ok(
  exists (
    select 1
    from storage.buckets
    where id = 'catalog-assets'
      and public = true
      and file_size_limit = 10485760
      and allowed_mime_types = array['image/webp']
  ),
  'catalog-assets bucket is public-read with the approved size/type limits'
);

select ok(
  (
    select count(*) = 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'INSERT'
      and policyname = 'store admins can upload own store catalog assets'
  ),
  'catalog-assets has exactly one upload policy'
);

select ok(
  (
    select count(*) = 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'DELETE'
      and policyname = 'store admins can delete own store catalog assets'
  ),
  'catalog-assets has exactly one delete policy'
);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('SELECT', 'UPDATE')
      and policyname like '%catalog assets%'
  ),
  'catalog-assets has no read or replace policy (public read bypasses RLS; replace creates a new asset)'
);

-- functional: fixtures -------------------------------------------------------

insert into public.stores (id, slug, name)
values
  ('10000000-0000-4000-8000-000000000001', 'store-a', 'Store A'),
  ('10000000-0000-4000-8000-000000000002', 'store-b', 'Store B');

insert into auth.users (id)
values
  ('20000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002');

insert into public.store_memberships (id, store_id, auth_user_id)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002'
  );

insert into public.assets (id, store_id, storage_path, content_type, byte_size, width, height)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001/product/40000000-0000-4000-8000-000000000001.webp',
    'image/webp',
    12345,
    800,
    800
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002/product/40000000-0000-4000-8000-000000000002.webp',
    'image/webp',
    12345,
    800,
    800
  );

insert into public.products (id, store_id, name, description, image_asset_id, quantity_available)
values
  (
    '50000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Product A',
    'Store A product',
    '40000000-0000-4000-8000-000000000001',
    5
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'Product B',
    'Store B product',
    '40000000-0000-4000-8000-000000000002',
    5
  );

update public.products
set updated_at = '2000-01-01 00:00:00+00'
where id = '50000000-0000-4000-8000-000000000001';

update public.products
set quantity_available = 6
where id = '50000000-0000-4000-8000-000000000001';

select ok(
  (
    select updated_at > '2000-01-01 00:00:00+00'
    from public.products
    where id = '50000000-0000-4000-8000-000000000001'
  ),
  'updating a product refreshes updated_at'
);

-- functional: cross-tenant isolation ------------------------------------------

set local role anon;

select throws_ok(
  $$ select id from public.assets $$,
  '42501',
  null,
  'anonymous users cannot read assets'
);

select throws_ok(
  $$ select id from public.products $$,
  '42501',
  null,
  'anonymous users cannot read products'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001';

select results_eq(
  $$ select id from public.assets order by id $$,
  $$ values ('40000000-0000-4000-8000-000000000001'::uuid) $$,
  'a store administrator reads only their own store assets'
);

select results_eq(
  $$ select id from public.products order by id $$,
  $$ values ('50000000-0000-4000-8000-000000000001'::uuid) $$,
  'a store administrator reads only their own store products'
);

select throws_ok(
  $$ insert into public.products (store_id, name, description, image_asset_id) values ('10000000-0000-4000-8000-000000000001', '   ', 'x', '40000000-0000-4000-8000-000000000001') $$,
  '23514',
  null,
  'products reject a blank name'
);

select throws_ok(
  $$ insert into public.products (store_id, name, description, image_asset_id, quantity_available) values ('10000000-0000-4000-8000-000000000001', 'Negative', 'x', '40000000-0000-4000-8000-000000000001', -1) $$,
  '23514',
  null,
  'products reject a negative quantity_available'
);

insert into public.products (store_id, name, sku, description, image_asset_id)
values (
  '10000000-0000-4000-8000-000000000001',
  'Duplicate SKU',
  'sku-1',
  'x',
  '40000000-0000-4000-8000-000000000001'
);

select throws_ok(
  $$
    insert into public.products (store_id, name, sku, description, image_asset_id)
    values ('10000000-0000-4000-8000-000000000001', 'Duplicate SKU 2', 'sku-1', 'x', '40000000-0000-4000-8000-000000000001')
  $$,
  '23505',
  null,
  'products reject a duplicate SKU within the same store'
);

-- RLS filters an unauthorized row out of the UPDATE/DELETE candidate set, so
-- a denied cross-tenant UPDATE/DELETE is a silent zero-row no-op, never a
-- thrown error (unlike INSERT, whose WITH CHECK does raise 42501 below).

select lives_ok(
  $$ update public.products set name = 'Hijacked' where id = '50000000-0000-4000-8000-000000000002' $$,
  'updating another store''s product does not raise an error, it matches no row'
);

reset role;

select is(
  (select name from public.products where id = '50000000-0000-4000-8000-000000000002'),
  'Product B',
  'the other store''s product remains unchanged after a denied cross-tenant update'
);

set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001';

select lives_ok(
  $$ delete from public.products where id = '50000000-0000-4000-8000-000000000002' $$,
  'deleting another store''s product does not raise an error, it matches no row'
);

reset role;

select ok(
  exists (select 1 from public.products where id = '50000000-0000-4000-8000-000000000002'),
  'the other store''s product still exists after a denied cross-tenant delete'
);

set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001';

select lives_ok(
  $$ delete from public.assets where id = '40000000-0000-4000-8000-000000000002' $$,
  'deleting another store''s asset does not raise an error, it matches no row'
);

reset role;

select ok(
  exists (select 1 from public.assets where id = '40000000-0000-4000-8000-000000000002'),
  'the other store''s asset still exists after a denied cross-tenant delete'
);

set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001';

select throws_ok(
  $$
    insert into public.products (store_id, name, description, image_asset_id)
    values ('10000000-0000-4000-8000-000000000002', 'Cross-tenant insert', 'x', '40000000-0000-4000-8000-000000000002')
  $$,
  '42501',
  null,
  'a store administrator cannot create a product for another store'
);

reset role;

select * from finish();
rollback;
