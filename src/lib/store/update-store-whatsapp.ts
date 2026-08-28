import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { STORE_COLUMNS, toAdminStore, type AdminStore } from "./get-admin-store";

export type UpdateStoreWhatsappResult =
  { ok: true; store: AdminStore } | { ok: false; kind: "not_found" | "service_error" };

export async function updateStoreWhatsapp(
  supabase: SupabaseClient<Database>,
  storeId: string,
  whatsappNumber: string,
): Promise<UpdateStoreWhatsappResult> {
  const { data, error } = await supabase
    .from("stores")
    .update({
      whatsapp_number: whatsappNumber,
      // FR-004: changing the number always resets verification, even coming
      // from an already-verified state — never conditional on prior status.
      whatsapp_verification_status: "unverified",
      whatsapp_verified_at: null,
    })
    .eq("id", storeId)
    .select(STORE_COLUMNS)
    .maybeSingle();

  if (error) {
    return { ok: false, kind: "service_error" };
  }

  if (!data) {
    return { ok: false, kind: "not_found" };
  }

  return { ok: true, store: toAdminStore(data) };
}
