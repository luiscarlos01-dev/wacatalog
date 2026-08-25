import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createProduct } from "@/lib/products/create-product";
import { updateProduct } from "@/lib/products/update-product";
import { deleteProduct } from "@/lib/products/delete-product";
import { setProductLifecycle } from "@/lib/products/set-product-lifecycle";
import { listProducts } from "@/lib/products/list-products";
import type { ProductRow } from "@/lib/products/product-row";
import type { Database } from "@/types/database";

const baseRow: ProductRow = {
  id: "product-1",
  name: "Product A",
  sku: null,
  description: "desc",
  image_asset_id: "asset-1",
  quantity_available: 5,
  is_visible: false,
  is_orderable: false,
  is_active: true,
  created_at: "2026-08-24T00:00:00.000Z",
  updated_at: "2026-08-24T00:00:00.000Z",
};

// Accepts one result reused for every call, or several results consumed in
// order (for code under test that issues more than one query against the
// same table, e.g. updateProduct's existence check before its update).
function makeChain(terminal: "single" | "maybeSingle", ...results: unknown[]) {
  const queue = results.length > 0 ? [...results] : [undefined];
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const returnsSelf = vi.fn(() => chain);
  const next = () => (queue.length > 1 ? queue.shift() : queue[0]);

  chain.insert = returnsSelf;
  chain.update = returnsSelf;
  chain.delete = returnsSelf;
  chain.select = returnsSelf;
  chain.eq = returnsSelf;
  chain.order = vi.fn(async () => next());
  chain[terminal] = vi.fn(async () => next());

  return chain;
}

function createProductsSupabaseMock({
  assetOwned = true,
  assetCheckError = false,
  productsChain,
}: {
  assetOwned?: boolean;
  assetCheckError?: boolean;
  productsChain: Record<string, unknown>;
}) {
  const assetsChain = makeChain("maybeSingle", {
    data: assetOwned && !assetCheckError ? { id: "asset-1" } : null,
    error: assetCheckError ? { message: "connection reset" } : null,
  });

  const from = vi.fn((table: string) => (table === "assets" ? assetsChain : productsChain));

  return { client: { from } as unknown as SupabaseClient<Database>, assetsChain };
}

describe("createProduct", () => {
  it("rejects when imageAssetId does not belong to the store, without inserting", async () => {
    const productsChain = makeChain("single", { data: null, error: null });
    const { client } = createProductsSupabaseMock({ assetOwned: false, productsChain });

    const result = await createProduct(client, {
      storeId: "store-a",
      name: "New",
      sku: null,
      description: "x",
      imageAssetId: "asset-from-other-store",
      quantityAvailable: 1,
      isVisible: false,
      isOrderable: false,
    });

    expect(result).toEqual({ ok: false, kind: "validation_error" });
    expect(productsChain.insert).not.toHaveBeenCalled();
  });

  it("reports service_error instead of validation_error when the ownership check itself fails", async () => {
    const productsChain = makeChain("single", { data: null, error: null });
    const { client } = createProductsSupabaseMock({ assetCheckError: true, productsChain });

    const result = await createProduct(client, {
      storeId: "store-a",
      name: "New",
      sku: null,
      description: "x",
      imageAssetId: "asset-1",
      quantityAvailable: 1,
      isVisible: false,
      isOrderable: false,
    });

    expect(result).toEqual({ ok: false, kind: "service_error" });
    expect(productsChain.insert).not.toHaveBeenCalled();
  });

  it("maps a unique-violation on SKU to a conflict result", async () => {
    const productsChain = makeChain("single", {
      data: null,
      error: { code: "23505", message: "duplicate key" },
    });
    const { client } = createProductsSupabaseMock({ productsChain });

    const result = await createProduct(client, {
      storeId: "store-a",
      name: "New",
      sku: "sku-1",
      description: "x",
      imageAssetId: "asset-1",
      quantityAvailable: 1,
      isVisible: false,
      isOrderable: false,
    });

    expect(result).toEqual({ ok: false, kind: "sku_conflict" });
  });

  it("maps a negative-quantity check violation to a validation error", async () => {
    const productsChain = makeChain("single", {
      data: null,
      error: { code: "23514", message: "quantity_available_check" },
    });
    const { client } = createProductsSupabaseMock({ productsChain });

    const result = await createProduct(client, {
      storeId: "store-a",
      name: "New",
      sku: null,
      description: "x",
      imageAssetId: "asset-1",
      quantityAvailable: -1,
      isVisible: false,
      isOrderable: false,
    });

    expect(result).toEqual({ ok: false, kind: "validation_error" });
  });

  it("returns the created product on success", async () => {
    const productsChain = makeChain("single", { data: baseRow, error: null });
    const { client } = createProductsSupabaseMock({ productsChain });

    const result = await createProduct(client, {
      storeId: "store-a",
      name: "Product A",
      sku: null,
      description: "desc",
      imageAssetId: "asset-1",
      quantityAvailable: 5,
      isVisible: false,
      isOrderable: false,
    });

    expect(result).toEqual({
      ok: true,
      product: expect.objectContaining({ id: "product-1", isVisible: false, isOrderable: false }),
    });
  });
});

describe("updateProduct", () => {
  it("reports not_found instead of leaking a cross-tenant SKU conflict", async () => {
    const productsChain = makeChain("maybeSingle", { data: null, error: null });
    const { client } = createProductsSupabaseMock({ productsChain });

    const result = await updateProduct(client, {
      storeId: "store-a",
      productId: "product-of-store-b",
      name: "Hijack",
      sku: null,
      description: "x",
      imageAssetId: "asset-1",
      quantityAvailable: 1,
      isVisible: false,
      isOrderable: false,
    });

    expect(result).toEqual({ ok: false, kind: "not_found" });
  });

  it("maps a duplicate SKU on edit to a conflict result", async () => {
    const productsChain = makeChain(
      "maybeSingle",
      { data: { id: "product-1" }, error: null }, // existence check
      { data: null, error: { code: "23505", message: "duplicate key" } }, // update
    );
    const { client } = createProductsSupabaseMock({ productsChain });

    const result = await updateProduct(client, {
      storeId: "store-a",
      productId: "product-1",
      name: "Product A",
      sku: "taken",
      description: "x",
      imageAssetId: "asset-1",
      quantityAvailable: 1,
      isVisible: false,
      isOrderable: false,
    });

    expect(result).toEqual({ ok: false, kind: "sku_conflict" });
  });

  it("reports service_error instead of validation_error when the ownership check itself fails", async () => {
    const productsChain = makeChain("maybeSingle", { data: { id: "product-1" }, error: null });
    const { client } = createProductsSupabaseMock({ assetCheckError: true, productsChain });

    const result = await updateProduct(client, {
      storeId: "store-a",
      productId: "product-1",
      name: "Product A",
      sku: null,
      description: "x",
      imageAssetId: "asset-1",
      quantityAvailable: 1,
      isVisible: false,
      isOrderable: false,
    });

    expect(result).toEqual({ ok: false, kind: "service_error" });
  });
});

describe("deleteProduct", () => {
  it("returns the freed imageAssetId on success", async () => {
    const productsChain = makeChain("maybeSingle", {
      data: { image_asset_id: "asset-1" },
      error: null,
    });
    const { client } = createProductsSupabaseMock({ productsChain });

    await expect(deleteProduct(client, "store-a", "product-1")).resolves.toEqual({
      ok: true,
      imageAssetId: "asset-1",
    });
  });

  it("reports not_found for a cross-tenant delete", async () => {
    const productsChain = makeChain("maybeSingle", { data: null, error: null });
    const { client } = createProductsSupabaseMock({ productsChain });

    await expect(deleteProduct(client, "store-a", "product-of-store-b")).resolves.toEqual({
      ok: false,
      kind: "not_found",
    });
  });
});

describe("setProductLifecycle", () => {
  it("always resets visibility and orderability to false on reactivate, regardless of prior state", async () => {
    const productsChain = makeChain("maybeSingle", {
      data: { ...baseRow, is_visible: false, is_orderable: false, is_active: true },
      error: null,
    });
    const { client } = createProductsSupabaseMock({ productsChain });

    await setProductLifecycle(client, "store-a", "product-1", "reactivate");

    expect(productsChain.update).toHaveBeenCalledWith({
      is_active: true,
      is_visible: false,
      is_orderable: false,
    });
  });

  it("only flips is_active on deactivate, leaving visibility/orderability untouched", async () => {
    const productsChain = makeChain("maybeSingle", { data: baseRow, error: null });
    const { client } = createProductsSupabaseMock({ productsChain });

    await setProductLifecycle(client, "store-a", "product-1", "deactivate");

    expect(productsChain.update).toHaveBeenCalledWith({ is_active: false });
  });

  it("reports not_found for a cross-tenant lifecycle change", async () => {
    const productsChain = makeChain("maybeSingle", { data: null, error: null });
    const { client } = createProductsSupabaseMock({ productsChain });

    await expect(
      setProductLifecycle(client, "store-a", "product-of-store-b", "deactivate"),
    ).resolves.toEqual({ ok: false, kind: "not_found" });
  });
});

describe("listProducts", () => {
  it("reports a service error instead of throwing when the query fails", async () => {
    const productsChain = makeChain("maybeSingle", { data: null, error: { message: "down" } });
    const { client } = createProductsSupabaseMock({ productsChain });

    await expect(listProducts(client, "store-a")).resolves.toEqual({ ok: false });
  });

  it("maps every row to the admin representation", async () => {
    const productsChain = makeChain("maybeSingle", { data: [baseRow], error: null });
    const { client } = createProductsSupabaseMock({ productsChain });

    await expect(listProducts(client, "store-a")).resolves.toEqual({
      ok: true,
      items: [expect.objectContaining({ id: "product-1" })],
    });
  });
});
