import { beforeAll, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { queryPublicCatalog } from "@/lib/public-catalog/query-public-catalog";
import type { Database } from "@/types/database";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key";
});

type StoreRpcRow = {
  slug: string;
  name: string;
  whatsapp_available: boolean;
  whatsapp_number: string | null;
};

const baseStoreRow: StoreRpcRow = {
  slug: "loja-a",
  name: "Loja A",
  whatsapp_available: false,
  whatsapp_number: null,
};

function createSupabaseMock({
  storeRows,
  storeError = null,
  products = [],
  productsError = null,
  banners = [],
  bannersError = null,
}: {
  storeRows: StoreRpcRow[];
  storeError?: { message: string } | null;
  products?: unknown[];
  productsError?: { message: string } | null;
  banners?: unknown[];
  bannersError?: { message: string } | null;
}) {
  const rpc = vi.fn(async (fn: string) => {
    if (fn === "resolve_public_store") {
      return { data: storeError ? null : storeRows, error: storeError };
    }
    if (fn === "list_public_products") {
      return { data: productsError ? null : products, error: productsError };
    }
    if (fn === "list_public_hero_banners") {
      return { data: bannersError ? null : banners, error: bannersError };
    }
    throw new Error(`unexpected rpc ${fn}`);
  });

  return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
}

describe("queryPublicCatalog", () => {
  it("returns not_found when the slug does not match any store", async () => {
    const { client } = createSupabaseMock({ storeRows: [] });

    const result = await queryPublicCatalog(client, "loja-inexistente");

    expect(result).toEqual({ ok: false, kind: "not_found" });
  });

  it("returns service_error when the store lookup fails", async () => {
    const { client } = createSupabaseMock({
      storeRows: [],
      storeError: { message: "connection reset" },
    });

    const result = await queryPublicCatalog(client, "loja-a");

    expect(result).toEqual({ ok: false, kind: "service_error" });
  });

  it("returns service_error when the products or banners lookup fails", async () => {
    const { client } = createSupabaseMock({
      storeRows: [baseStoreRow],
      productsError: { message: "connection reset" },
    });

    const result = await queryPublicCatalog(client, "loja-a");

    expect(result).toEqual({ ok: false, kind: "service_error" });
  });

  it("resolves the store, products and banners scoped to the requested slug", async () => {
    const { client, rpc } = createSupabaseMock({ storeRows: [baseStoreRow] });

    await queryPublicCatalog(client, "loja-a");

    expect(rpc).toHaveBeenCalledWith("resolve_public_store", { p_slug: "loja-a" });
    expect(rpc).toHaveBeenCalledWith("list_public_products", {
      p_store_slug: "loja-a",
      p_storage_base_url: "https://project.supabase.co",
    });
    expect(rpc).toHaveBeenCalledWith("list_public_hero_banners", {
      p_store_slug: "loja-a",
      p_storage_base_url: "https://project.supabase.co",
    });
  });

  it("shapes a resolved catalog with only public fields, images already built by the database function", async () => {
    const { client } = createSupabaseMock({
      storeRows: [baseStoreRow],
      products: [
        {
          id: "product-1",
          name: "Produto A",
          sku: "SKU-1",
          description: "Descrição",
          image_url:
            "https://project.supabase.co/storage/v1/object/public/catalog-assets/x/product/asset-1.webp",
          quantity_available: 3,
          is_orderable: true,
        },
      ],
      banners: [
        {
          id: "banner-1",
          image_url:
            "https://project.supabase.co/storage/v1/object/public/catalog-assets/x/banner/asset-2.webp",
          accessible_description: "Banner acessível",
          title: "Título",
          banner_text: null,
          position: 1,
        },
      ],
    });

    const result = await queryPublicCatalog(client, "loja-a");

    expect(result).toEqual({
      ok: true,
      catalog: {
        store: {
          slug: "loja-a",
          name: "Loja A",
          whatsappAvailable: false,
          whatsappNumber: null,
        },
        products: [
          {
            id: "product-1",
            name: "Produto A",
            sku: "SKU-1",
            description: "Descrição",
            imageUrl:
              "https://project.supabase.co/storage/v1/object/public/catalog-assets/x/product/asset-1.webp",
            quantityAvailable: 3,
            isOrderable: true,
          },
        ],
        banners: [
          {
            id: "banner-1",
            imageUrl:
              "https://project.supabase.co/storage/v1/object/public/catalog-assets/x/banner/asset-2.webp",
            accessibleDescription: "Banner acessível",
            title: "Título",
            text: null,
            position: 1,
          },
        ],
      },
    });
  });

  // `whatsappAvailable` is derived inside `resolve_public_store` itself
  // (verified AND number present), not in this function anymore — see the
  // pgTAP coverage in supabase/tests/public-catalog.sql for that logic.
  // This function only needs to pass the database's own boolean through.
  it("passes whatsappAvailable through from the database function unchanged", async () => {
    const { client } = createSupabaseMock({
      storeRows: [{ ...baseStoreRow, whatsapp_available: true, whatsapp_number: "5511999999999" }],
    });

    const result = await queryPublicCatalog(client, "loja-a");

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        catalog: expect.objectContaining({
          store: expect.objectContaining({ whatsappAvailable: true }),
        }),
      }),
    );
  });
});
