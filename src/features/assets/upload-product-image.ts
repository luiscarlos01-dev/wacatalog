import type { Asset } from "@/lib/assets/create-asset";

export type UploadProductImageResult =
  | { ok: true; asset: Asset }
  | { ok: false; kind: "too_large" | "unsupported_format" | "service_error" };

export async function uploadProductImage(file: File): Promise<UploadProductImageResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", "product");

  try {
    const response = await fetch("/admin/assets", { method: "POST", body: formData });

    if (response.status === 201) {
      return { ok: true, asset: (await response.json()) as Asset };
    }

    if (response.status === 413) {
      return { ok: false, kind: "too_large" };
    }

    if (response.status === 415) {
      return { ok: false, kind: "unsupported_format" };
    }

    return { ok: false, kind: "service_error" };
  } catch {
    return { ok: false, kind: "service_error" };
  }
}
