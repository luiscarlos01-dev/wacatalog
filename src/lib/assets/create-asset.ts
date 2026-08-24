import { randomUUID } from "node:crypto";

import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type AssetKind = "product" | "banner";

export type Asset = {
  id: string;
  contentType: "image/webp";
  byteSize: number;
  width: number;
  height: number;
  publicUrl: string;
};

export type CreateAssetInput = {
  storeId: string;
  kind: AssetKind;
  buffer: Buffer;
};

export type CreateAssetResult =
  | { ok: true; asset: Asset }
  | { ok: false; kind: "too_large" | "invalid_format" | "service_error" };

const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024;
// libvips reports both HEIC and HEIF content under the single "heif" format id.
const ACCEPTED_SHARP_FORMATS = new Set(["jpeg", "png", "webp", "heif"]);
const BUCKET = "catalog-assets";

export async function createAsset(
  supabase: SupabaseClient<Database>,
  input: CreateAssetInput,
): Promise<CreateAssetResult> {
  if (input.buffer.byteLength > MAX_ORIGINAL_BYTES) {
    return { ok: false, kind: "too_large" };
  }

  let normalized: Buffer;
  let width: number;
  let height: number;

  try {
    // Sniffs the real file content (magic bytes), never the client-declared
    // extension or Content-Type (docs/patterns/supabase-storage.md MUST).
    const metadata = await sharp(input.buffer).metadata();

    if (!metadata.format || !ACCEPTED_SHARP_FORMATS.has(metadata.format)) {
      return { ok: false, kind: "invalid_format" };
    }

    // `.rotate()` applies EXIF orientation before normalizing: camera photos
    // (this feature's primary input, ADR-0003) are frequently stored sideways
    // with orientation carried only in metadata.
    const output = await sharp(input.buffer).rotate().webp().toBuffer({ resolveWithObject: true });

    normalized = output.data;
    width = output.info.width;
    height = output.info.height;
  } catch {
    return { ok: false, kind: "invalid_format" };
  }

  const assetId = randomUUID();
  const storagePath = `${input.storeId}/${input.kind}/${assetId}.webp`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, normalized, {
      contentType: "image/webp",
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, kind: "service_error" };
  }

  const { error: insertError } = await supabase.from("assets").insert({
    id: assetId,
    store_id: input.storeId,
    storage_path: storagePath,
    content_type: "image/webp",
    byte_size: normalized.byteLength,
    width,
    height,
  });

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { ok: false, kind: "service_error" };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  return {
    ok: true,
    asset: {
      id: assetId,
      contentType: "image/webp",
      byteSize: normalized.byteLength,
      width,
      height,
      publicUrl,
    },
  };
}
