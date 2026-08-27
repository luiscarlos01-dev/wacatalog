import type { SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/config/env";
import type { Database } from "@/types/database";

export type PublicStore = {
  slug: string;
  name: string;
  whatsappAvailable: boolean;
  whatsappNumber: string | null;
};

export type PublicProduct = {
  id: string;
  name: string;
  sku: string | null;
  description: string;
  imageUrl: string;
  quantityAvailable: number;
  isOrderable: boolean;
};

export type PublicBanner = {
  id: string;
  imageUrl: string;
  accessibleDescription: string;
  title: string | null;
  text: string | null;
  position: number;
};

export type PublicCatalog = {
  store: PublicStore;
  products: PublicProduct[];
  banners: PublicBanner[];
};

export type QueryPublicCatalogResult =
  { ok: true; catalog: PublicCatalog } | { ok: false; kind: "not_found" | "service_error" };

// Reads go through `security definer` functions (202608250001_public_
// catalog_access.sql), not direct table queries: a plain `grant select on
// table ... to anon` exposes every column via the Data API (anyone with the
// publishable key can call it directly), not just the ones this function
// happens to select. Each function's return type is exactly the approved
// public shape, so calling one directly can never leak more than this does.
export async function queryPublicCatalog(
  supabase: SupabaseClient<Database>,
  storeSlug: string,
): Promise<QueryPublicCatalogResult> {
  const { supabaseUrl } = getPublicEnv();

  const { data: storeRows, error: storeError } = await supabase.rpc("resolve_public_store", {
    p_slug: storeSlug,
  });

  if (storeError) {
    return { ok: false, kind: "service_error" };
  }

  const store = storeRows?.[0];

  if (!store) {
    return { ok: false, kind: "not_found" };
  }

  const [productsResult, bannersResult] = await Promise.all([
    supabase.rpc("list_public_products", {
      p_store_slug: storeSlug,
      p_storage_base_url: supabaseUrl,
    }),
    supabase.rpc("list_public_hero_banners", {
      p_store_slug: storeSlug,
      p_storage_base_url: supabaseUrl,
    }),
  ]);

  if (productsResult.error || bannersResult.error) {
    return { ok: false, kind: "service_error" };
  }

  return {
    ok: true,
    catalog: {
      store: {
        slug: store.slug,
        name: store.name,
        whatsappAvailable: store.whatsapp_available,
        whatsappNumber: store.whatsapp_number,
      },
      products: productsResult.data.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        imageUrl: product.image_url,
        quantityAvailable: product.quantity_available,
        isOrderable: product.is_orderable,
      })),
      banners: bannersResult.data.map((banner) => ({
        id: banner.id,
        imageUrl: banner.image_url,
        accessibleDescription: banner.accessible_description,
        title: banner.title,
        text: banner.banner_text,
        position: banner.position,
      })),
    },
  };
}
