import type { AdminProduct } from "@/lib/products/product-row";

export type ProductFormInput = {
  name: string;
  sku: string | null;
  description: string;
  imageAssetId: string;
  quantityAvailable: number;
  isVisible: boolean;
  isOrderable: boolean;
};

export type SaveProductResult =
  | { ok: true; product: AdminProduct }
  | {
      ok: false;
      kind: "sku_conflict" | "validation_error" | "not_found" | "service_error";
      fields?: Record<string, string>;
    };

export async function saveProduct(
  input: ProductFormInput,
  productId?: string,
): Promise<SaveProductResult> {
  try {
    const response = await fetch(productId ? `/admin/products/${productId}` : "/admin/products", {
      method: productId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (response.status === 200 || response.status === 201) {
      return { ok: true, product: (await response.json()) as AdminProduct };
    }

    if (response.status === 409) {
      return { ok: false, kind: "sku_conflict" };
    }

    if (response.status === 422) {
      const body = (await response.json().catch(() => null)) as {
        fields?: Record<string, string>;
      } | null;
      return { ok: false, kind: "validation_error", fields: body?.fields };
    }

    if (response.status === 404) {
      return { ok: false, kind: "not_found" };
    }

    return { ok: false, kind: "service_error" };
  } catch {
    return { ok: false, kind: "service_error" };
  }
}
