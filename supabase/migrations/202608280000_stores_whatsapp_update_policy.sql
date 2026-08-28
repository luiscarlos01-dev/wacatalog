-- specs/005-whatsapp-store-config/contracts/whatsapp-store-config.md, achado
-- A-1 (contract-reviewer): feature 001 only granted `SELECT` on `stores` to
-- `authenticated` (202608220000_stores.sql) — no `UPDATE` grant or RLS policy
-- for it existed until this feature needed to write to the table for the
-- first time. Without this, `PATCH /admin/store` and
-- `POST /admin/store/whatsapp/verification` fail with `42501 permission
-- denied` against a real database, regardless of the application code being
-- correct. Same scoping pattern as
-- "store admins can update own store products" (202608240001_products.sql).

grant update on table public.stores to authenticated;

create policy "store admins can update own store"
  on public.stores
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.store_memberships
      where store_memberships.store_id = stores.id
        and store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
    )
  )
  with check (
    exists (
      select 1
      from public.store_memberships
      where store_memberships.store_id = stores.id
        and store_memberships.auth_user_id = (select auth.uid())
        and store_memberships.role = 'store_admin'
    )
  );
