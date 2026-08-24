import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

const BUCKET = "catalog-assets";

export type DeleteAssetIfOrphanedResult = { ok: true; removed: boolean } | { ok: false };

// `hero_banners` also references `assets` (docs/data-model.md §2.5) but is not
// materialized by any feature yet (out of scope here, data-model.md "Fora do
// escopo desta feature"). Only `products` can be checked today; the feature
// that creates `hero_banners` must extend this reference check.
export async function deleteAssetIfOrphaned(
  supabase: SupabaseClient<Database>,
  assetId: string,
): Promise<DeleteAssetIfOrphanedResult> {
  const { data: referencingProducts, error: referenceError } = await supabase
    .from("products")
    .select("id")
    .eq("image_asset_id", assetId)
    .limit(1);

  if (referenceError) {
    return { ok: false };
  }

  if (referencingProducts.length > 0) {
    return { ok: true, removed: false };
  }

  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select("storage_path")
    .eq("id", assetId)
    .maybeSingle();

  if (assetError) {
    return { ok: false };
  }

  if (!asset) {
    return { ok: true, removed: false };
  }

  const { error: removeError } = await supabase.storage.from(BUCKET).remove([asset.storage_path]);

  if (removeError) {
    return { ok: false };
  }

  const { error: deleteError } = await supabase.from("assets").delete().eq("id", assetId);

  if (deleteError) {
    return { ok: false };
  }

  return { ok: true, removed: true };
}
