import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

// Same public bucket as `src/lib/assets/create-asset.ts` (no shared constant
// module exists yet for it; matches that file's own local convention).
const ASSETS_BUCKET = "catalog-assets";

export const PRODUCT_COLUMNS =
  "id, name, sku, description, image_asset_id, quantity_available, is_visible, is_orderable, is_active, created_at, updated_at";

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

// `imageUrl` is resolved from `image_asset_id` via the same deterministic
// storage path the upload flow itself writes to (`src/lib/assets/
// create-asset.ts`: `{storeId}/{kind}/{assetId}.webp`) and that
// `list_public_products` already relies on for the public catalog
// (supabase/migrations/202608250001_public_catalog_access.sql) — no join
// with `assets` needed. An earlier version of this function joined
// `assets(storage_path)` instead; that query intermittently returned a
// stale `image_asset_id` on a GET issued right after an UPDATE in the same
// admin session (specs/002-product-management/deltas/
// product-image-preview.md), never reproduced against Postgres/PostgREST
// directly — root cause not fully isolated, but the join was never
// necessary in the first place, so removing it removes the bug's trigger.
export function toAdminProduct(
  supabase: SupabaseClient<Database>,
  storeId: string,
  row: ProductRow,
): AdminProduct {
  const {
    data: { publicUrl },
  } = supabase.storage
    .from(ASSETS_BUCKET)
    .getPublicUrl(`${storeId}/product/${row.image_asset_id}.webp`);

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
