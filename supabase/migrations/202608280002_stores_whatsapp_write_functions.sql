-- specs/005-whatsapp-store-config/contracts/whatsapp-store-config.md, achado
-- A-2 (contract-reviewer, blocking): the A-1 fix (202608280000) granted
-- `UPDATE` on the whole `stores` table with only a row-scoped RLS policy
-- (which store, not which column). Tested with a real administrator
-- identity: this let her write `name`/`slug` (violates CLAUDE.md — store
-- identity belongs to the maintainer, not the admin) and, worse, forge
-- `whatsapp_verification_status`/`whatsapp_verified_at` directly, bypassing
-- `POST /admin/store/whatsapp/verification` entirely and reopening L-1
-- through a different path. `supabase/tests/admin-store-access.sql:537-541`
-- already proved this regression: its "authenticated administrators cannot
-- update stores" assertion broke the moment 202608280000 landed.
--
-- Fix: both writes move behind `security definer` functions that resolve
-- the calling administrator's store only via `store_memberships`/session,
-- never a client-supplied id — same pattern as the public-catalog functions
-- (202608250001_public_catalog_access.sql). `authenticated` loses all direct
-- `UPDATE` privilege on `stores`. A plain `grant update (whatsapp_number)`
-- was considered and rejected: `update_store_whatsapp_number` also resets
-- `whatsapp_verification_status`/`whatsapp_verified_at` in the same
-- statement (explicit reset, not the `set_store_update_metadata` trigger's
-- `is distinct from` check — relying on the trigger would break the
-- already-approved same-number-resubmit behavior, spec.md Assumptions), so
-- a column-only grant would still need those two columns writable too.

revoke update on table public.stores from authenticated;
drop policy if exists "store admins can update own store" on public.stores;

-- Both functions return `setof`, not a bare `public.stores`: verified
-- directly against the local PostgREST endpoint that a function returning a
-- single composite that is "row IS NULL" (e.g. an `into` that matched zero
-- rows) serializes as `{"id":null,"slug":null,...}` — a truthy JSON object,
-- not JSON `null`. `data` in the TS layer would never be falsy, silently
-- breaking `confirm_store_whatsapp_verification`'s conflict semantics (no
-- number configured). `setof` with zero rows serializes unambiguously as
-- `[]`, matching the array `data?.[0]` pattern already used for
-- `resolve_public_store`/`list_public_products` (202608250001).

create function public.update_store_whatsapp_number(p_whatsapp_number text)
returns setof public.stores
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
begin
  select store_memberships.store_id
    into strict v_store_id
    from public.store_memberships
    where store_memberships.auth_user_id = (select auth.uid())
      and store_memberships.role = 'store_admin';

  return query
    update public.stores
      set whatsapp_number = p_whatsapp_number,
          whatsapp_verification_status = 'unverified',
          whatsapp_verified_at = null
      where id = v_store_id
      returning *;
exception
  -- `into strict` raises these when the caller doesn't resolve to exactly
  -- one store_admin membership. `route.ts` already blocks this earlier via
  -- `getAuthenticatedStore`, but this function is directly callable via RPC
  -- outside the application (defense in depth).
  when no_data_found or too_many_rows then
    raise exception 'not authorized' using errcode = '42501';
end;
$$;

revoke all on function public.update_store_whatsapp_number(text) from public;
grant execute on function public.update_store_whatsapp_number(text) to authenticated;

create function public.confirm_store_whatsapp_verification()
returns setof public.stores
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
begin
  select store_memberships.store_id
    into strict v_store_id
    from public.store_memberships
    where store_memberships.auth_user_id = (select auth.uid())
      and store_memberships.role = 'store_admin';

  -- Zero rows (empty result set) when no number is configured — same
  -- conflict semantics `confirm-store-whatsapp.ts` already handled against
  -- the previous direct `.update()` call.
  return query
    update public.stores
      set whatsapp_verification_status = 'verified',
          whatsapp_verified_at = now()
      where id = v_store_id
        and whatsapp_number is not null
      returning *;
exception
  when no_data_found or too_many_rows then
    raise exception 'not authorized' using errcode = '42501';
end;
$$;

revoke all on function public.confirm_store_whatsapp_verification() from public;
grant execute on function public.confirm_store_whatsapp_verification() to authenticated;
