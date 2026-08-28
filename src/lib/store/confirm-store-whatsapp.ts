import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { STORE_COLUMNS, toAdminStore, type AdminStore } from "./get-admin-store";

export type ConfirmStoreWhatsappResult =
  { ok: true; store: AdminStore } | { ok: false; kind: "no_number" | "service_error" };

export async function confirmStoreWhatsapp(
  supabase: SupabaseClient<Database>,
  storeId: string,
): Promise<ConfirmStoreWhatsappResult> {
  const { data, error } = await supabase
    .from("stores")
    .update({
      whatsapp_verification_status: "verified",
      whatsapp_verified_at: new Date().toISOString(),
    })
    // `whatsapp_number` not null is the only condition this feature treats as
    // a conflict (research.md); reconfirming an already-verified number is
    // idempotent, not a conflict, so prior status is never checked here.
    .eq("id", storeId)
    .not("whatsapp_number", "is", null)
    .select(STORE_COLUMNS)
    .maybeSingle();

  if (error) {
    return { ok: false, kind: "service_error" };
  }

  if (!data) {
    return { ok: false, kind: "no_number" };
  }

  return { ok: true, store: toAdminStore(data) };
}
