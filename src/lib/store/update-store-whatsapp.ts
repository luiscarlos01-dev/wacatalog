import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { toAdminStore, type AdminStore } from "./get-admin-store";

export type UpdateStoreWhatsappResult =
  { ok: true; store: AdminStore } | { ok: false; kind: "not_found" | "service_error" };

export async function updateStoreWhatsapp(
  supabase: SupabaseClient<Database>,
  whatsappNumber: string,
): Promise<UpdateStoreWhatsappResult> {
  // Achado A-2 (contract-reviewer): `authenticated` has no direct `UPDATE`
  // grant on `stores` any more — the mutation (and the FR-004 verification
  // reset in the same statement) lives inside a `security definer` function
  // that resolves the caller's own store via `store_memberships`/session,
  // never a client-supplied id (202608280002_stores_whatsapp_write_functions.sql).
  const { data, error } = await supabase.rpc("update_store_whatsapp_number", {
    p_whatsapp_number: whatsappNumber,
  });

  if (error) {
    return { ok: false, kind: "service_error" };
  }

  const row = data?.[0];

  if (!row) {
    return { ok: false, kind: "not_found" };
  }

  return { ok: true, store: toAdminStore(row) };
}
