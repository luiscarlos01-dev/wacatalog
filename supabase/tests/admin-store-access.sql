begin;

select plan(51);

select ok(to_regclass('public.stores') is not null, 'stores exists');

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
    where attrelid = 'public.stores'::regclass
      and attnum > 0
      and not attisdropped
  ),
  array[
    'id:uuid:required',
    'slug:text:required',
    'name:text:required',
    'whatsapp_number:text:optional',
    'whatsapp_verification_status:text:required',
    'whatsapp_verified_at:timestamp with time zone:optional',
    'created_at:timestamp with time zone:required',
    'updated_at:timestamp with time zone:required'
  ],
  'stores has exactly the approved fields, types and nullability'
);

select ok(
  (
    select count(*) = 4
      and bool_and(
        case attname
          when 'id' then expression = 'gen_random_uuid()'
          when 'whatsapp_verification_status' then expression = '''unverified''::text'
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
      where attribute.attrelid = 'public.stores'::regclass
    ) as store_defaults
  ),
  'stores has only the approved defaults'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.stores'::regclass
      and contype = 'p'
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.stores'::regclass
            and attname = 'id'
        )
      ]::smallint[]
  ),
  'stores primary key is id'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.stores'::regclass
      and contype = 'u'
      and conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = 'public.stores'::regclass
            and attname = 'slug'
        )
      ]::smallint[]
  ),
  'store slug is unique'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.stores'::regclass
      and conname = 'stores_whatsapp_number_format_check'
      and pg_get_constraintdef(oid) like '%55[0-9]{10,11}%'
  ),
  'WhatsApp numbers use the approved normalized format'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.stores'::regclass
      and conname = 'stores_whatsapp_verification_status_check'
      and pg_get_constraintdef(oid) like '%unverified%'
      and pg_get_constraintdef(oid) like '%verified%'
  ),
  'WhatsApp verification status accepts only approved values'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.stores'::regclass
      and conname = 'stores_whatsapp_verification_check'
      and pg_get_constraintdef(oid) like '%whatsapp_number IS NOT NULL%'
      and pg_get_constraintdef(oid) like '%whatsapp_verified_at IS NULL%'
      and pg_get_constraintdef(oid) like '%whatsapp_verified_at IS NOT NULL%'
  ),
  'WhatsApp verification fields remain consistent'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.stores'::regclass
      and tgname = 'set_store_update_metadata'
      and tgenabled = 'O'
      and not tgisinternal
  ),
  'stores update trigger is enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.stores'::regclass),
  'RLS is enabled for stores'
);

select ok(
  has_table_privilege('authenticated', 'public.stores', 'SELECT'),
  'authenticated users receive the stores read privilege'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.stores',
    'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ),
  'authenticated users receive no stores write privilege'
);

select ok(
  not has_table_privilege(
    'anon',
    'public.stores',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ),
  'anonymous users receive no stores privilege'
);

select ok(
  to_regclass('public.store_memberships') is not null,
  'store_memberships exists after stores'
);

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
    where attrelid = 'public.store_memberships'::regclass
      and attnum > 0
      and not attisdropped
  ),
  array[
    'id:uuid:required',
    'store_id:uuid:required',
    'auth_user_id:uuid:required',
    'role:text:required',
    'created_at:timestamp with time zone:required'
  ],
  'store_memberships has exactly the approved fields, types and nullability'
);

select ok(
  (
    select count(*) = 3
      and bool_and(
        case attname
          when 'id' then expression = 'gen_random_uuid()'
          when 'role' then expression = '''store_admin''::text'
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
      where attribute.attrelid = 'public.store_memberships'::regclass
    ) as membership_defaults
  ),
  'store_memberships has only the approved defaults'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.store_memberships'::regclass
      and contype = 'p'
  ),
  'store_memberships has a primary key'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.store_memberships'::regclass
      and contype = 'f'
      and confrelid = 'public.stores'::regclass
  ),
  'store_memberships references stores'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.store_memberships'::regclass
      and contype = 'f'
      and confrelid = 'auth.users'::regclass
  ),
  'store_memberships references auth.users'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.store_memberships'::regclass
      and conname = 'store_memberships_store_user_key'
      and contype = 'u'
  ),
  'store and user membership is unique'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.store_memberships'::regclass
      and conname = 'store_memberships_role_check'
      and pg_get_constraintdef(oid) like '%store_admin%'
  ),
  'only the store_admin membership role is accepted'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.store_memberships'::regclass),
  'RLS is enabled for memberships'
);

select ok(
  has_table_privilege('authenticated', 'public.store_memberships', 'SELECT'),
  'authenticated users receive the membership read privilege'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.store_memberships',
    'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ),
  'authenticated users receive no membership write privilege'
);

select ok(
  not has_table_privilege(
    'anon',
    'public.store_memberships',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ),
  'anonymous users receive no membership privilege'
);

select ok(
  (
    select count(*) = 1
      and bool_and(
        cmd = 'SELECT'
        and roles = array['authenticated']::name[]
        and qual like '%auth.uid()%'
        and qual like '%store_admin%'
      )
    from pg_policies
    where schemaname = 'public'
      and tablename = 'store_memberships'
      and policyname = 'store admins can read own membership'
  ),
  'membership policy reads only the verified user store_admin rows'
);

select ok(
  (
    select count(*) = 1
      and bool_and(
        cmd = 'SELECT'
        and roles = array['authenticated']::name[]
        and qual like '%store_memberships%'
        and qual like '%auth.uid()%'
        and qual like '%store_admin%'
      )
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stores'
      and policyname = 'store admins can read own store'
  ),
  'stores policy resolves the verified user through a store_admin membership'
);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('stores', 'store_memberships')
      and 'anon' = any (roles)
  ),
  'neither table has an anonymous policy'
);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('stores', 'store_memberships')
      and cmd <> 'SELECT'
  ),
  'neither table has a browser write policy'
);

select throws_ok(
  $$
    insert into public.stores (slug, name, whatsapp_number)
    values ('invalid-whatsapp', 'Invalid WhatsApp', '11999999999')
  $$,
  '23514',
  null,
  'stores reject a WhatsApp number outside the approved normalized format'
);

select throws_ok(
  $$
    insert into public.stores (
      slug,
      name,
      whatsapp_number,
      whatsapp_verification_status
    )
    values ('missing-verification-time', 'Missing verification time', '5511999999999', 'verified')
  $$,
  '23514',
  null,
  'verified stores require a verification timestamp'
);

select throws_ok(
  $$
    insert into public.stores (
      slug,
      name,
      whatsapp_verification_status,
      whatsapp_verified_at
    )
    values ('unexpected-verification-time', 'Unexpected verification time', 'unverified', now())
  $$,
  '23514',
  null,
  'unverified stores reject a verification timestamp'
);

insert into public.stores (id, slug, name)
values ('10000000-0000-4000-8000-000000000001', 'store-a', 'Store A');

insert into public.stores (
  id,
  slug,
  name,
  whatsapp_number,
  whatsapp_verification_status,
  whatsapp_verified_at
)
values (
  '10000000-0000-4000-8000-000000000002',
  'store-b',
  'Store B',
  '5511999999999',
  'verified',
  now()
);

update public.stores
set whatsapp_number = '5511988888888',
    whatsapp_verification_status = 'verified',
    whatsapp_verified_at = now(),
    updated_at = '2000-01-01 00:00:00+00'
where id = '10000000-0000-4000-8000-000000000001';

select ok(
  (
    select whatsapp_verification_status = 'unverified'
      and whatsapp_verified_at is null
      and updated_at > '2000-01-01 00:00:00+00'
    from public.stores
    where id = '10000000-0000-4000-8000-000000000001'
  ),
  'changing the WhatsApp number resets verification and maintains updated_at'
);

insert into auth.users (id)
values
  ('20000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002'),
  ('20000000-0000-4000-8000-000000000003');

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

select throws_ok(
  $$
    insert into public.store_memberships (store_id, auth_user_id, role)
    values (
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000003',
      'unsupported_role'
    )
  $$,
  '23514',
  null,
  'memberships reject roles outside the approved MVP role'
);

select throws_ok(
  $$
    insert into public.store_memberships (store_id, auth_user_id)
    values (
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001'
    )
  $$,
  '23505',
  null,
  'memberships reject duplicate store and user pairs'
);

set local role anon;

select throws_ok(
  $$ select id from public.stores $$,
  '42501',
  null,
  'anonymous users cannot read stores'
);

select throws_ok(
  $$ select id from public.store_memberships $$,
  '42501',
  null,
  'anonymous users cannot read memberships'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001';

select results_eq(
  $$ select store_id from public.store_memberships order by store_id $$,
  $$ values ('10000000-0000-4000-8000-000000000001'::uuid) $$,
  'an authenticated administrator reads only their own membership'
);

select results_eq(
  $$ select id from public.stores order by id $$,
  $$ values ('10000000-0000-4000-8000-000000000001'::uuid) $$,
  'an authenticated administrator reads only their own store'
);

select is_empty(
  $$
    select id
    from public.stores
    where id = '10000000-0000-4000-8000-000000000002'
  $$,
  'a store administrator cannot read another store'
);

select throws_ok(
  $$ insert into public.stores (slug, name) values ('denied-store', 'Denied store') $$,
  '42501',
  null,
  'authenticated administrators cannot create stores'
);

select throws_ok(
  $$ update public.stores set name = 'Denied update' $$,
  '42501',
  null,
  'authenticated administrators cannot update stores'
);

select throws_ok(
  $$ delete from public.stores $$,
  '42501',
  null,
  'authenticated administrators cannot delete stores'
);

select throws_ok(
  $$
    insert into public.store_memberships (store_id, auth_user_id)
    values (
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000003'
    )
  $$,
  '42501',
  null,
  'authenticated administrators cannot create memberships'
);

select throws_ok(
  $$ update public.store_memberships set role = 'store_admin' $$,
  '42501',
  null,
  'authenticated administrators cannot update memberships'
);

select throws_ok(
  $$ delete from public.store_memberships $$,
  '42501',
  null,
  'authenticated administrators cannot delete memberships'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000002';

select results_eq(
  $$ select store_id from public.store_memberships order by store_id $$,
  $$ values ('10000000-0000-4000-8000-000000000002'::uuid) $$,
  'the second administrator reads only their own membership'
);

select results_eq(
  $$ select id from public.stores order by id $$,
  $$ values ('10000000-0000-4000-8000-000000000002'::uuid) $$,
  'the second administrator reads only their own store'
);

select is_empty(
  $$
    select id
    from public.stores
    where id = '10000000-0000-4000-8000-000000000001'
  $$,
  'the second store administrator cannot read the first store'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000003';

select is_empty(
  $$ select id from public.store_memberships $$,
  'an authenticated user without membership reads no membership rows'
);

select is_empty(
  $$ select id from public.stores $$,
  'an authenticated user without membership reads no stores'
);

reset role;

select * from finish();
rollback;
