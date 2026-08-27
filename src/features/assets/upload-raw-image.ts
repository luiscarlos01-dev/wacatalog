import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

// Direct browser-to-Storage upload, bypassing the Next.js route entirely
// (ADR-0009): a Vercel Function's request body cannot exceed 4.5 MB, which
// silently broke any image between 4.5 MB and the 10 MB ADR-0003 already
// promises. `POST /admin/assets` only ever receives the resulting
// `storagePath`, never the file bytes.
const BUCKET = "asset-uploads";

export type UploadRawImageResult =
  { ok: true; storagePath: string } | { ok: false; kind: "service_error" };

export async function uploadRawImage(storeId: string, file: File): Promise<UploadRawImageResult> {
  const storagePath = `${storeId}/${crypto.randomUUID()}`;

  const { error } = await getBrowserSupabaseClient()
    .storage.from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (error) {
    return { ok: false, kind: "service_error" };
  }

  return { ok: true, storagePath };
}
