import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type AdminStore = {
  id: string;
  slug: string;
  name: string;
  whatsappNumber: string | null;
  whatsappVerificationStatus: "unverified" | "verified";
  whatsappVerifiedAt: string | null;
};

type StoreQueryResult =
  { ok: true; store: AdminStore } | { ok: false; kind: "not_found" | "service_error" };

export async function queryAdminStore(
  supabase: SupabaseClient<Database>,
  storeId: string,
): Promise<StoreQueryResult> {
  const { data, error } = await supabase
    .from("stores")
    .select("id, slug, name, whatsapp_number, whatsapp_verification_status, whatsapp_verified_at")
    .eq("id", storeId)
    .maybeSingle();

  if (error) {
    return { ok: false, kind: "service_error" };
  }

  if (!data) {
    return { ok: false, kind: "not_found" };
  }

  return {
    ok: true,
    store: {
      id: data.id,
      slug: data.slug,
      name: data.name,
      whatsappNumber: data.whatsapp_number,
      // The generated column type is a plain `string` because the DB
      // constraint is a CHECK, not a native Postgres enum; the DB guarantees
      // only these two values can be stored.
      whatsappVerificationStatus: data.whatsapp_verification_status as "unverified" | "verified",
      whatsappVerifiedAt: data.whatsapp_verified_at,
    },
  };
}
