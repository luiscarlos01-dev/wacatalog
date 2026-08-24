import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type AssetOwnershipCheck = { ok: true; owned: boolean } | { ok: false };

// `image_asset_id` must reference an asset of the same store. Postgres cannot
// express a conditional FK across two tables' columns, so this is checked here
// (docs/data-model.md §2.4, specs/002-product-management/data-model.md).
export async function checkAssetOwnership(
  supabase: SupabaseClient<Database>,
  assetId: string,
  storeId: string,
): Promise<AssetOwnershipCheck> {
  const { data, error } = await supabase
    .from("assets")
    .select("id")
    .eq("id", assetId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) {
    return { ok: false };
  }

  return { ok: true, owned: Boolean(data) };
}
