import { describe, expect, it, vi, beforeEach } from "vitest";

const uploadMock = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  getBrowserSupabaseClient: () => ({
    storage: { from: () => ({ upload: uploadMock }) },
  }),
}));

const { uploadRawImage } = await import("@/features/assets/upload-raw-image");

function jpegFile(): File {
  return new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });
}

describe("uploadRawImage", () => {
  beforeEach(() => {
    uploadMock.mockReset();
  });

  it("uploads under a store-scoped, system-generated path and returns it", async () => {
    uploadMock.mockResolvedValue({ data: { path: "mock" }, error: null });
    const file = jpegFile();

    const result = await uploadRawImage("store-a", file);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.storagePath).toMatch(/^store-a\/[0-9a-f-]{36}$/);

    expect(uploadMock).toHaveBeenCalledWith(
      result.storagePath,
      file,
      expect.objectContaining({ contentType: "image/jpeg", upsert: false }),
    );
  });

  // ADR-0009 depends on this: the bucket's own file_size_limit/
  // allowed_mime_types rejections must surface as the specific kind the
  // form shows a real message for, not a generic "try again" — otherwise
  // the two e2e scenarios covering exactly this become unreachable.
  it("maps an EntityTooLarge Storage error to too_large", async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: { name: "StorageApiError", message: "too large", status: 413, code: "EntityTooLarge" },
    });

    const result = await uploadRawImage("store-a", jpegFile());

    expect(result).toEqual({ ok: false, kind: "too_large" });
  });

  it("maps an InvalidMimeType Storage error to unsupported_format", async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: { name: "StorageApiError", message: "bad type", status: 400, code: "InvalidMimeType" },
    });

    const result = await uploadRawImage("store-a", jpegFile());

    expect(result).toEqual({ ok: false, kind: "unsupported_format" });
  });

  it("maps any other Storage error to service_error", async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: { name: "StorageApiError", message: "down", status: 500, code: "InternalError" },
    });

    const result = await uploadRawImage("store-a", jpegFile());

    expect(result).toEqual({ ok: false, kind: "service_error" });
  });
});
