import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { toAdminStore, type AdminStore } from "./get-admin-store";

export type ConfirmStoreWhatsappResult =
  { ok: true; store: AdminStore } | { ok: false; kind: "no_number" | "service_error" };

export async function confirmStoreWhatsapp(
  supabase: SupabaseClient<Database>,
): Promise<ConfirmStoreWhatsappResult> {
  // Achado A-2 (contract-reviewer): same move as `update-store-whatsapp.ts`
  // — the mutation lives inside a `security definer` function that resolves
  // the caller's own store via `store_memberships`/session. It returns zero
  // rows (not a null row) when `whatsapp_number` is null — verified directly
  // against the local PostgREST endpoint that a `returns <table>` function
  // serializes a "row IS NULL" result as a truthy `{"col":null,...}` object,
  // which would have silently broken this conflict check; `returns setof`
  // with zero rows serializes as `[]`, same as `resolve_public_store`.
  const { data, error } = await supabase.rpc("confirm_store_whatsapp_verification");

  if (error) {
    return { ok: false, kind: "service_error" };
  }

  const row = data?.[0];

  if (!row) {
    return { ok: false, kind: "no_number" };
  }

  return { ok: true, store: toAdminStore(row) };
}
