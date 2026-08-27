import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { toAdminProduct, type ProductRow } from "@/lib/products/product-row";
import type { Database } from "@/types/database";

const baseRow: ProductRow = {
  id: "product-1",
  name: "Product A",
  sku: "SKU-1",
  description: "desc",
  image_asset_id: "asset-1",
  quantity_available: 5,
  is_visible: true,
  is_orderable: true,
  is_active: true,
  created_at: "2026-08-24T00:00:00.000Z",
  updated_at: "2026-08-24T00:00:00.000Z",
};

function createSupabaseMock() {
  const getPublicUrl = vi.fn((path: string) => ({
    data: { publicUrl: `https://cdn.test/${path}` },
  }));
  const storage = { from: vi.fn(() => ({ getPublicUrl })) };

  return { client: { storage } as unknown as SupabaseClient<Database>, storage, getPublicUrl };
}

describe("toAdminProduct", () => {
  it("resolves imageUrl from the deterministic {storeId}/product/{assetId}.webp storage path", () => {
    const { client, storage, getPublicUrl } = createSupabaseMock();

    const product = toAdminProduct(client, "store-a", baseRow);

    expect(storage.from).toHaveBeenCalledWith("catalog-assets");
    expect(getPublicUrl).toHaveBeenCalledWith("store-a/product/asset-1.webp");
    expect(product).toEqual({
      id: "product-1",
      name: "Product A",
      sku: "SKU-1",
      description: "desc",
      imageAssetId: "asset-1",
      imageUrl: "https://cdn.test/store-a/product/asset-1.webp",
      quantityAvailable: 5,
      isVisible: true,
      isOrderable: true,
      isActive: true,
      createdAt: "2026-08-24T00:00:00.000Z",
      updatedAt: "2026-08-24T00:00:00.000Z",
    });
  });
});
