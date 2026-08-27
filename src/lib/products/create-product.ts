import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { PRODUCT_COLUMNS, toAdminProduct, type AdminProduct } from "./product-row";
import { checkAssetOwnership } from "./verify-owned-asset";

export type CreateProductInput = {
  storeId: string;
  name: string;
  sku: string | null;
  description: string;
  imageAssetId: string;
  quantityAvailable: number;
  isVisible: boolean;
  isOrderable: boolean;
};

export type CreateProductResult =
  | { ok: true; product: AdminProduct }
  | { ok: false; kind: "sku_conflict" | "validation_error" | "service_error" };

export async function createProduct(
  supabase: SupabaseClient<Database>,
  input: CreateProductInput,
): Promise<CreateProductResult> {
  const ownership = await checkAssetOwnership(supabase, input.imageAssetId, input.storeId);

  if (!ownership.ok) {
    return { ok: false, kind: "service_error" };
  }

  if (!ownership.owned) {
    return { ok: false, kind: "validation_error" };
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      store_id: input.storeId,
      name: input.name,
      sku: input.sku,
      description: input.description,
      image_asset_id: input.imageAssetId,
      quantity_available: input.quantityAvailable,
      is_visible: input.isVisible,
      is_orderable: input.isOrderable,
    })
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, kind: "sku_conflict" };
    }

    if (error.code === "23514") {
      return { ok: false, kind: "validation_error" };
    }

    return { ok: false, kind: "service_error" };
  }

  const product = toAdminProduct(supabase, data);

  if (!product) {
    return { ok: false, kind: "service_error" };
  }

  return { ok: true, product };
}
