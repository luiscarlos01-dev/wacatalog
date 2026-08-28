import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

// Direct browser-to-Storage upload, mirroring `upload-raw-image.ts`
// (ADR-0009): a Vercel Function's request body cannot exceed 4.5 MB, and a
// real catalog PDF (up to ~100 MB, per the maintainer) is always above that.
// `POST /admin/catalog-imports` only ever receives the resulting
// `storagePath`, never the file bytes (ADR-0008).
const BUCKET = "catalog-import-uploads";
// Mirrors the bucket's own `file_size_limit` (supabase/migrations/
// 202608280000_catalog_import_uploads.sql). Checked client-side, before any
// network call, so an oversized file (a real catalog can run to ~100 MB) is
// rejected instantly instead of uploading megabytes just to be told no.
// The maintainer's manual T030 validation originally hit a generic
// "service_error" message for an oversized file instead of a specific one;
// a local repro against this exact Storage API returned a clean, well-formed
// `EntityTooLarge` JSON at the 50 MB boundary, so that specific ambiguous-
// response theory wasn't confirmed — but the pre-check is strictly better
// regardless (no wasted upload, no dependency on interpreting the Storage
// SDK's error shape at all).
const MAX_BYTES = 52_428_800;

export type UploadCatalogPdfResult =
  | { ok: true; storagePath: string }
  | { ok: false; kind: "too_large" | "unsupported_format" | "service_error" };

// Storage API error `code` values for the bucket's own `file_size_limit`/
// `allowed_mime_types` rejections (https://supabase.com/docs/guides/storage/debugging/error-codes).
const ENTITY_TOO_LARGE = "EntityTooLarge";
const INVALID_MIME_TYPE = "InvalidMimeType";

function storageErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

export async function uploadCatalogPdf(
  storeId: string,
  file: File,
): Promise<UploadCatalogPdfResult> {
  if (file.size > MAX_BYTES) {
    return { ok: false, kind: "too_large" };
  }

  const storagePath = `${storeId}/${crypto.randomUUID()}.pdf`;

  const { error } = await getBrowserSupabaseClient()
    .storage.from(BUCKET)
    .upload(storagePath, file, { contentType: "application/pdf", upsert: false });

  if (error) {
    const code = storageErrorCode(error);

    if (code === ENTITY_TOO_LARGE) {
      return { ok: false, kind: "too_large" };
    }

    if (code === INVALID_MIME_TYPE) {
      return { ok: false, kind: "unsupported_format" };
    }

    return { ok: false, kind: "service_error" };
  }

  return { ok: true, storagePath };
}
