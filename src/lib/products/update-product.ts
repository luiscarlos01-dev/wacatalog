import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { PRODUCT_COLUMNS, toAdminProduct, type AdminProduct } from "./product-row";
import { checkAssetOwnership } from "./verify-owned-asset";

export type UpdateProductInput = {
  storeId: string;
  productId: string;
  name: string;
  sku: string | null;
  description: string;
  imageAssetId: string;
  quantityAvailable: number;
  isVisible: boolean;
  isOrderable: boolean;
};

export type UpdateProductResult =
  | { ok: true; product: AdminProduct }
  | { ok: false; kind: "not_found" | "sku_conflict" | "validation_error" | "service_error" };

// ProductUpdate is a full replacement of the editable fields (docs/api/openapi.yaml).
export async function updateProduct(
  supabase: SupabaseClient<Database>,
  input: UpdateProductInput,
): Promise<UpdateProductResult> {
  // Resolve target-resource ownership before validating the body: a
  // cross-tenant request should see 404, never a 422 about a field on a
  // product it was never authorized to reach.
  const { data: existing, error: existingError } = await supabase
    .from("products")
    .select("id")
    .eq("id", input.productId)
    .eq("store_id", input.storeId)
    .maybeSingle();

  if (existingError) {
    return { ok: false, kind: "service_error" };
  }

  if (!existing) {
    return { ok: false, kind: "not_found" };
  }

  const ownership = await checkAssetOwnership(supabase, input.imageAssetId, input.storeId);

  if (!ownership.ok) {
    return { ok: false, kind: "service_error" };
  }

  if (!ownership.owned) {
    return { ok: false, kind: "validation_error" };
  }

  const { data, error } = await supabase
    .from("products")
    .update({
      name: input.name,
      sku: input.sku,
      description: input.description,
      image_asset_id: input.imageAssetId,
      quantity_available: input.quantityAvailable,
      is_visible: input.isVisible,
      is_orderable: input.isOrderable,
    })
    // Scoping by store_id (redundant with RLS) makes a cross-tenant update a
    // guaranteed zero-row no-op rather than relying on the policy alone
    // (ADR-0002 rule 6).
    .eq("id", input.productId)
    .eq("store_id", input.storeId)
    .select(PRODUCT_COLUMNS)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, kind: "sku_conflict" };
    }

    if (error.code === "23514") {
      return { ok: false, kind: "validation_error" };
    }

    return { ok: false, kind: "service_error" };
  }

  if (!data) {
    return { ok: false, kind: "not_found" };
  }

  return { ok: true, product: toAdminProduct(supabase, input.storeId, data) };
}
