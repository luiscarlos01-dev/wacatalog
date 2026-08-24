create table public.store_memberships (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  auth_user_id uuid not null references auth.users (id),
  role text not null default 'store_admin',
  created_at timestamptz not null default now(),
  constraint store_memberships_role_check check (role = 'store_admin'),
  constraint store_memberships_store_user_key unique (store_id, auth_user_id)
);

alter table public.store_memberships enable row level security;

revoke all on table public.store_memberships from anon;
revoke all on table public.store_memberships from authenticated;
grant select on table public.store_memberships to authenticated;

drop policy if exists "store admins can read own membership" on public.store_memberships;
create policy "store admins can read own membership"
  on public.store_memberships
  for select
  to authenticated
  using (auth_user_id = (select auth.uid()) and role = 'store_admin');

create policy "store admins can read own store"
  on public.stores
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_memberships
      where store_memberships.store_id = stores.id
        and store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
    )
  );
