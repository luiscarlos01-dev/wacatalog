import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { PRODUCT_COLUMNS, toAdminProduct, type AdminProduct } from "./product-row";

export type ListProductsResult = { ok: true; items: AdminProduct[] } | { ok: false };

export async function listProducts(
  supabase: SupabaseClient<Database>,
  storeId: string,
): Promise<ListProductsResult> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return { ok: false };
  }

  return { ok: true, items: data.map((row) => toAdminProduct(supabase, storeId, row)) };
}
