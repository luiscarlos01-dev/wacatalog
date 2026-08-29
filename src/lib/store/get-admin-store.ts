import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export const STORE_COLUMNS =
  "id, slug, name, whatsapp_number, whatsapp_verification_status, whatsapp_verified_at";

export type StoreRow = {
  id: string;
  slug: string;
  name: string;
  whatsapp_number: string | null;
  whatsapp_verification_status: string;
  whatsapp_verified_at: string | null;
};

export type AdminStore = {
  id: string;
  slug: string;
  name: string;
  whatsappNumber: string | null;
  whatsappVerificationStatus: "unverified" | "verified";
  whatsappVerifiedAt: string | null;
};

// The generated column type for `whatsapp_verification_status` is a plain
// `string` because the DB constraint is a CHECK, not a native Postgres enum;
// the DB guarantees only these two values can be stored.
export function toAdminStore(row: StoreRow): AdminStore {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    whatsappNumber: row.whatsapp_number,
    whatsappVerificationStatus: row.whatsapp_verification_status as "unverified" | "verified",
    whatsappVerifiedAt: row.whatsapp_verified_at,
  };
}

type StoreQueryResult =
  { ok: true; store: AdminStore } | { ok: false; kind: "not_found" | "service_error" };

export async function queryAdminStore(
  supabase: SupabaseClient<Database>,
  storeId: string,
): Promise<StoreQueryResult> {
  const { data, error } = await supabase
    .from("stores")
    .select(STORE_COLUMNS)
    .eq("id", storeId)
    .maybeSingle();

  if (error) {
    return { ok: false, kind: "service_error" };
  }

  if (!data) {
    return { ok: false, kind: "not_found" };
  }

  return { ok: true, store: toAdminStore(data) };
}
