import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type DeleteProductResult =
  { ok: true; imageAssetId: string } | { ok: false; kind: "not_found" | "service_error" };

export async function deleteProduct(
  supabase: SupabaseClient<Database>,
  storeId: string,
  productId: string,
): Promise<DeleteProductResult> {
  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("store_id", storeId)
    .select("image_asset_id")
    .maybeSingle();

  if (error) {
    return { ok: false, kind: "service_error" };
  }

  if (!data) {
    return { ok: false, kind: "not_found" };
  }

  return { ok: true, imageAssetId: data.image_asset_id };
}
