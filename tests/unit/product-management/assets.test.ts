import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAsset } from "@/lib/assets/create-asset";
import { deleteAssetIfOrphaned } from "@/lib/assets/delete-asset-if-orphaned";
import type { Database } from "@/types/database";

function createSyntheticJpeg(): Promise<Buffer> {
  return sharp({
    create: { width: 4, height: 4, channels: 3, background: { r: 200, g: 30, b: 30 } },
  })
    .jpeg()
    .toBuffer();
}

function createAssetSupabaseMock({
  uploadError = null,
  insertError = null,
}: { uploadError?: Error | null; insertError?: Error | null } = {}) {
  const uploadMock = vi.fn(async () => ({ data: { path: "mock" }, error: uploadError }));
  const removeMock = vi.fn(async () => ({ data: null, error: null }));
  const getPublicUrlMock = vi.fn((path: string) => ({
    data: { publicUrl: `https://cdn.test/${path}` },
  }));
  const insertMock = vi.fn(async () => ({ error: insertError }));

  const client = {
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
        remove: removeMock,
        getPublicUrl: getPublicUrlMock,
      })),
    },
    from: vi.fn(() => ({ insert: insertMock })),
  };

  return { client, uploadMock, removeMock, insertMock };
}

function asSupabaseClient(client: unknown) {
  return client as unknown as SupabaseClient<Database>;
}

describe("createAsset", () => {
  it("rejects a file above the 10 MB limit without inspecting its content", async () => {
    const { client, uploadMock } = createAssetSupabaseMock();
    const oversized = Buffer.alloc(10 * 1024 * 1024 + 1, 1);

    const result = await createAsset(asSupabaseClient(client), {
      storeId: "store-a",
      kind: "product",
      buffer: oversized,
    });

    expect(result).toEqual({ ok: false, kind: "too_large" });
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejects content whose real bytes are not a supported image format, regardless of size", async () => {
    const { client, uploadMock } = createAssetSupabaseMock();
    const notAnImage = Buffer.from("this is definitely not image content", "utf8");

    const result = await createAsset(asSupabaseClient(client), {
      storeId: "store-a",
      kind: "product",
      buffer: notAnImage,
    });

    expect(result).toEqual({ ok: false, kind: "invalid_format" });
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("normalizes an accepted format to WebP and persists it under the system-generated path", async () => {
    const { client, uploadMock, insertMock } = createAssetSupabaseMock();
    const jpeg = await createSyntheticJpeg();

    const result = await createAsset(asSupabaseClient(client), {
      storeId: "store-a",
      kind: "product",
      buffer: jpeg,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.asset.contentType).toBe("image/webp");
    expect(result.asset.publicUrl).toContain(`store-a/product/${result.asset.id}.webp`);

    expect(uploadMock).toHaveBeenCalledWith(
      `store-a/product/${result.asset.id}.webp`,
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/webp" }),
    );

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: result.asset.id,
        store_id: "store-a",
        content_type: "image/webp",
      }),
    );
  });

  it("cleans up the uploaded object when the database insert fails", async () => {
    const { client, removeMock } = createAssetSupabaseMock({ insertError: new Error("db down") });
    const jpeg = await createSyntheticJpeg();

    const result = await createAsset(asSupabaseClient(client), {
      storeId: "store-a",
      kind: "product",
      buffer: jpeg,
    });

    expect(result).toEqual({ ok: false, kind: "service_error" });
    expect(removeMock).toHaveBeenCalledTimes(1);
  });

  it("reports a service error and skips the database insert when the upload itself fails", async () => {
    const { client, insertMock } = createAssetSupabaseMock({
      uploadError: new Error("storage down"),
    });
    const jpeg = await createSyntheticJpeg();

    const result = await createAsset(asSupabaseClient(client), {
      storeId: "store-a",
      kind: "product",
      buffer: jpeg,
    });

    expect(result).toEqual({ ok: false, kind: "service_error" });
    expect(insertMock).not.toHaveBeenCalled();
  });
});

function createOrphanCheckSupabaseMock({
  referencingProducts = [] as Array<{ id: string }>,
  referenceError = null as Error | null,
  asset = { storage_path: "store-a/product/asset-1.webp" } as { storage_path: string } | null,
  assetError = null as Error | null,
  removeError = null as Error | null,
  deleteError = null as Error | null,
}) {
  const removeMock = vi.fn(async () => ({ data: null, error: removeError }));

  const productsQuery = {
    select: vi.fn(() => productsQuery),
    eq: vi.fn(() => productsQuery),
    limit: vi.fn(async () => ({ data: referencingProducts, error: referenceError })),
  };

  const assetsSelectChain = {
    eq: vi.fn(() => assetsSelectChain),
    maybeSingle: vi.fn(async () => ({ data: asset, error: assetError })),
  };

  const assetsDeleteChain = {
    eq: vi.fn(async () => ({ error: deleteError })),
  };

  const assetsTable = {
    select: vi.fn(() => assetsSelectChain),
    delete: vi.fn(() => assetsDeleteChain),
  };

  const client = {
    storage: { from: vi.fn(() => ({ remove: removeMock })) },
    from: vi.fn((table: string) => (table === "products" ? productsQuery : assetsTable)),
  };

  return { client, removeMock, assetsDeleteChain };
}

describe("deleteAssetIfOrphaned", () => {
  it("keeps the asset when another product still references it", async () => {
    const { client, removeMock } = createOrphanCheckSupabaseMock({
      referencingProducts: [{ id: "product-1" }],
    });

    const result = await deleteAssetIfOrphaned(asSupabaseClient(client), "asset-1");

    expect(result).toEqual({ ok: true, removed: false });
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("removes the storage object and the row when no product references it", async () => {
    const { client, removeMock, assetsDeleteChain } = createOrphanCheckSupabaseMock({});

    const result = await deleteAssetIfOrphaned(asSupabaseClient(client), "asset-1");

    expect(result).toEqual({ ok: true, removed: true });
    expect(removeMock).toHaveBeenCalledWith(["store-a/product/asset-1.webp"]);
    expect(assetsDeleteChain.eq).toHaveBeenCalledWith("id", "asset-1");
  });

  it("reports failure without deleting when the reference check itself fails", async () => {
    const { client, removeMock } = createOrphanCheckSupabaseMock({
      referenceError: new Error("db down"),
    });

    const result = await deleteAssetIfOrphaned(asSupabaseClient(client), "asset-1");

    expect(result).toEqual({ ok: false });
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("is a no-op when the asset row no longer exists", async () => {
    const { client, removeMock } = createOrphanCheckSupabaseMock({ asset: null });

    const result = await deleteAssetIfOrphaned(asSupabaseClient(client), "asset-1");

    expect(result).toEqual({ ok: true, removed: false });
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("reports failure when the storage object cannot be removed", async () => {
    const { client } = createOrphanCheckSupabaseMock({ removeError: new Error("storage down") });

    const result = await deleteAssetIfOrphaned(asSupabaseClient(client), "asset-1");

    expect(result).toEqual({ ok: false });
  });
});
