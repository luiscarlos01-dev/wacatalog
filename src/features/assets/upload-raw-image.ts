import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

// Direct browser-to-Storage upload, bypassing the Next.js route entirely
// (ADR-0009): a Vercel Function's request body cannot exceed 4.5 MB, which
// silently broke any image between 4.5 MB and the 10 MB ADR-0003 already
// promises. `POST /admin/assets` only ever receives the resulting
// `storagePath`, never the file bytes.
const BUCKET = "asset-uploads";

export type UploadRawImageResult =
  | { ok: true; storagePath: string }
  | { ok: false; kind: "too_large" | "unsupported_format" | "service_error" };

// Storage API error `code` values for the bucket's own `file_size_limit`/
// `allowed_mime_types` rejections (https://supabase.com/docs/guides/storage/debugging/error-codes).
// Branching on `code`, not the message text, per storage-js's own guidance
// (`StorageApiError.code`'s doc comment).
const ENTITY_TOO_LARGE = "EntityTooLarge";
const INVALID_MIME_TYPE = "InvalidMimeType";

function storageErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

export async function uploadRawImage(storeId: string, file: File): Promise<UploadRawImageResult> {
  const storagePath = `${storeId}/${crypto.randomUUID()}`;

  const { error } = await getBrowserSupabaseClient()
    .storage.from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

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
