import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

// Same public bucket as `src/lib/assets/create-asset.ts` (no shared constant
// module exists yet for it; matches that file's own local convention).
const ASSETS_BUCKET = "catalog-assets";

// `imageUrl` is resolved from `image_asset_id` via a direct join with
// `assets` (docs/api/openapi.yaml AdminProduct, specs/002-product-management/
// deltas/product-image-preview.md): RLS already lets a store admin read her
// own store's assets, so this doesn't need a `security definer` function
// like the public catalog's anon-facing reads do (supabase/migrations/
// 202608250001_public_catalog_access.sql).
export const PRODUCT_COLUMNS =
  "id, name, sku, description, image_asset_id, quantity_available, is_visible, is_orderable, is_active, created_at, updated_at, assets(storage_path)";

export type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  description: string;
  image_asset_id: string;
  quantity_available: number;
  is_visible: boolean;
  is_orderable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  assets: { storage_path: string } | null;
};

export type AdminProduct = {
  id: string;
  name: string;
  sku: string | null;
  description: string;
  imageAssetId: string;
  imageUrl: string;
  quantityAvailable: number;
  isVisible: boolean;
  isOrderable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// `row.assets` is only ever null if `image_asset_id` points at a row RLS
// hides or that no longer exists. Both would be a data-integrity bug — the
// column is NOT NULL and ownership against the same store is checked before
// every insert/update (`verify-owned-asset.ts`) — never a legitimate state,
// so callers treat it as a service error instead of rendering a broken image.
export function toAdminProduct(
  supabase: SupabaseClient<Database>,
  row: ProductRow,
): AdminProduct | null {
  if (!row.assets) {
    return null;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(row.assets.storage_path);

  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    description: row.description,
    imageAssetId: row.image_asset_id,
    imageUrl: publicUrl,
    quantityAvailable: row.quantity_available,
    isVisible: row.is_visible,
    isOrderable: row.is_orderable,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
