import type { AdminProduct } from "@/lib/products/product-row";
import type { FlaggedCatalogImportCandidate } from "@/lib/catalog-import/flag-duplicate-skus";
import { uploadCatalogPdf } from "@/features/catalog-import/upload-catalog-pdf";
import { saveProduct } from "@/features/products/save-product";

export type ImportCatalogResult =
  { ok: true; candidates: FlaggedCatalogImportCandidate[] } | { ok: false; message: string };

const UPLOAD_ERROR_MESSAGES: Record<"too_large" | "unsupported_format" | "service_error", string> =
  {
    too_large: "O arquivo excede o limite de 50 MB.",
    unsupported_format: "O arquivo enviado não é um PDF.",
    service_error: "Não foi possível enviar o arquivo agora. Tente novamente.",
  };

const GENERIC_ERROR_MESSAGE = "Não foi possível processar o PDF agora. Tente novamente.";

// Calls `uploadCatalogPdf` (T005) first, then `POST /admin/catalog-imports`
// with the resulting `storagePath`. Unlike `uploadProductImage`/`saveProduct`,
// this surfaces the server's own PT-BR `message` verbatim instead of a
// client-side kind enum: the endpoint's four failure reasons (not found, too
// large, unsupported format, and three distinct 422 causes) each already
// carry a specific message, and nothing downstream needs to branch on which
// one occurred.
export async function importCatalog(storeId: string, file: File): Promise<ImportCatalogResult> {
  const upload = await uploadCatalogPdf(storeId, file);

  if (!upload.ok) {
    return { ok: false, message: UPLOAD_ERROR_MESSAGES[upload.kind] };
  }

  try {
    const response = await fetch("/admin/catalog-imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath: upload.storagePath }),
    });

    if (response.status === 200) {
      const body = (await response.json()) as { candidates: FlaggedCatalogImportCandidate[] };
      return { ok: true, candidates: body.candidates };
    }

    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, message: errorBody?.message ?? GENERIC_ERROR_MESSAGE };
  } catch {
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }
}

export type ConfirmCandidateInput = {
  name: string;
  sku: string | null;
  description: string;
  imageAssetId: string | undefined;
};

export type ConfirmCandidateResult =
  { ok: true; product: AdminProduct } | { ok: false; message: string };

// FR-008/FR-010: creates one product for one confirmed, non-duplicate
// candidate, reusing `POST /admin/products` (feature 002) without
// alteration — same SKU-uniqueness and ownership rules as manual creation.
// Quantity/visibility/orderability are never part of the review UI (plan.md);
// they take the same "off by default" defaults as any other new product.
export async function confirmCandidate(
  input: ConfirmCandidateInput,
): Promise<ConfirmCandidateResult> {
  if (!input.imageAssetId) {
    return { ok: false, message: "Anexe uma imagem para confirmar este item." };
  }

  if (!input.name.trim() || !input.description.trim()) {
    return { ok: false, message: "Preencha nome e descrição para confirmar este item." };
  }

  const result = await saveProduct({
    name: input.name.trim(),
    sku: input.sku?.trim() ? input.sku.trim() : null,
    description: input.description.trim(),
    imageAssetId: input.imageAssetId,
    quantityAvailable: 0,
    isVisible: false,
    isOrderable: false,
  });

  if (!result.ok) {
    if (result.kind === "sku_conflict") {
      return { ok: false, message: "Este SKU já está em uso por outro produto da loja." };
    }

    if (result.kind === "validation_error") {
      return { ok: false, message: "Confira os dados deste item." };
    }

    return { ok: false, message: "Não foi possível criar este produto agora. Tente novamente." };
  }

  return { ok: true, product: result.product };
}
