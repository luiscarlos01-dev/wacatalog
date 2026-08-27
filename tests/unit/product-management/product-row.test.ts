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
  assets: { storage_path: "store-a/product/asset-1.webp" },
};

function createSupabaseMock() {
  const getPublicUrl = vi.fn((path: string) => ({
    data: { publicUrl: `https://cdn.test/${path}` },
  }));
  const storage = { from: vi.fn(() => ({ getPublicUrl })) };

  return { client: { storage } as unknown as SupabaseClient<Database>, storage, getPublicUrl };
}

describe("toAdminProduct", () => {
  it("resolves imageUrl from the joined asset's storage_path via the storage client", () => {
    const { client, storage, getPublicUrl } = createSupabaseMock();

    const product = toAdminProduct(client, baseRow);

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

  // `image_asset_id` is NOT NULL and ownership against the same store is
  // checked before every insert/update, so a missing join is a data-integrity
  // bug, never a legitimate state — callers must treat it as a service error
  // instead of rendering a broken image.
  it("returns null instead of a broken image URL when the asset join is missing", () => {
    const { client } = createSupabaseMock();

    const product = toAdminProduct(client, { ...baseRow, assets: null });

    expect(product).toBeNull();
  });
});
