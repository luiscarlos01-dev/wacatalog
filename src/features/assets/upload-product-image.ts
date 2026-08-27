import type { Asset } from "@/lib/assets/create-asset";
import { uploadRawImage } from "@/features/assets/upload-raw-image";

export type UploadProductImageResult =
  | { ok: true; asset: Asset }
  | { ok: false; kind: "too_large" | "unsupported_format" | "service_error" };

export async function uploadProductImage(
  storeId: string,
  file: File,
): Promise<UploadProductImageResult> {
  const upload = await uploadRawImage(storeId, file);

  if (!upload.ok) {
    return { ok: false, kind: "service_error" };
  }

  try {
    const response = await fetch("/admin/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath: upload.storagePath, kind: "product" }),
    });

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
