import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { PRODUCT_COLUMNS, toAdminProduct, type AdminProduct } from "./product-row";

export type ProductLifecycleAction = "deactivate" | "reactivate";

export type SetProductLifecycleResult =
  { ok: true; product: AdminProduct } | { ok: false; kind: "not_found" | "service_error" };

export async function setProductLifecycle(
  supabase: SupabaseClient<Database>,
  storeId: string,
  productId: string,
  action: ProductLifecycleAction,
): Promise<SetProductLifecycleResult> {
  // Reactivation always resets visibility/orderability to off, regardless of
  // their state before deactivation (PRD regra de negócio 7).
  const patch =
    action === "deactivate"
      ? { is_active: false }
      : { is_active: true, is_visible: false, is_orderable: false };

  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", productId)
    .eq("store_id", storeId)
    .select(PRODUCT_COLUMNS)
    .maybeSingle();

  if (error) {
    return { ok: false, kind: "service_error" };
  }

  if (!data) {
    return { ok: false, kind: "not_found" };
  }

  const product = toAdminProduct(supabase, data);

  if (!product) {
    return { ok: false, kind: "service_error" };
  }

  return { ok: true, product };
}
