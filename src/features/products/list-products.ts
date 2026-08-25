import type { AdminProduct } from "@/lib/products/product-row";

export type ListProductsResult = { ok: true; items: AdminProduct[] } | { ok: false };

export async function listProducts(): Promise<ListProductsResult> {
  try {
    const response = await fetch("/admin/products");

    if (!response.ok) {
      return { ok: false };
    }

    const body = (await response.json()) as { items: AdminProduct[] };
    return { ok: true, items: body.items };
  } catch {
    return { ok: false };
  }
}
