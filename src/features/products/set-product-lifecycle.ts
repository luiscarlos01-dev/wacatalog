import type { AdminProduct } from "@/lib/products/product-row";

export type ProductLifecycleAction = "deactivate" | "reactivate";

export type SetProductLifecycleResult =
  { ok: true; product: AdminProduct } | { ok: false; kind: "not_found" | "service_error" };

export async function setProductLifecycle(
  productId: string,
  action: ProductLifecycleAction,
): Promise<SetProductLifecycleResult> {
  try {
    const response = await fetch(`/admin/products/${productId}/${action}`, { method: "POST" });

    if (response.ok) {
      return { ok: true, product: (await response.json()) as AdminProduct };
    }

    if (response.status === 404) {
      return { ok: false, kind: "not_found" };
    }

    return { ok: false, kind: "service_error" };
  } catch {
    return { ok: false, kind: "service_error" };
  }
}
