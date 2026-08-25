export type DeleteProductResult = { ok: true } | { ok: false; kind: "not_found" | "service_error" };

export async function deleteProduct(productId: string): Promise<DeleteProductResult> {
  try {
    const response = await fetch(`/admin/products/${productId}`, { method: "DELETE" });

    if (response.status === 204) {
      return { ok: true };
    }

    if (response.status === 404) {
      return { ok: false, kind: "not_found" };
    }

    return { ok: false, kind: "service_error" };
  } catch {
    return { ok: false, kind: "service_error" };
  }
}
