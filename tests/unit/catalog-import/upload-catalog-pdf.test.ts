import { describe, expect, it, vi, beforeEach } from "vitest";

const uploadMock = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  getBrowserSupabaseClient: () => ({
    storage: { from: () => ({ upload: uploadMock }) },
  }),
}));

const { uploadCatalogPdf } = await import("@/features/catalog-import/upload-catalog-pdf");

function pdfFile(sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], "catalogo.pdf", { type: "application/pdf" });
}

describe("uploadCatalogPdf", () => {
  beforeEach(() => {
    uploadMock.mockReset();
  });

  it("uploads under a store-scoped, system-generated .pdf path and returns it", async () => {
    uploadMock.mockResolvedValue({ data: { path: "mock" }, error: null });
    const file = pdfFile();

    const result = await uploadCatalogPdf("store-a", file);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.storagePath).toMatch(/^store-a\/[0-9a-f-]{36}\.pdf$/);

    expect(uploadMock).toHaveBeenCalledWith(
      result.storagePath,
      file,
      expect.objectContaining({ contentType: "application/pdf", upsert: false }),
    );
  });

  // Found via the maintainer's manual T030 validation with a real ~85-100 MB
  // catalog: a Vercel/Storage-infra gateway rejects a request this large with
  // a non-JSON body before Supabase's own API runs, so storage-js's error
  // never carries a `code` to branch on — it collapsed to a generic
  // "não foi possível enviar" message with no size-specific cause. A local
  // size check now rejects it before any network call, sidestepping that
  // ambiguous error shape entirely.
  it("rejects a file above the bucket's 50 MB limit without calling Storage", async () => {
    const result = await uploadCatalogPdf("store-a", pdfFile(52 * 1024 * 1024 + 1));

    expect(result).toEqual({ ok: false, kind: "too_large" });
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("maps an EntityTooLarge Storage error to too_large", async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: { name: "StorageApiError", message: "too large", status: 413, code: "EntityTooLarge" },
    });

    const result = await uploadCatalogPdf("store-a", pdfFile());

    expect(result).toEqual({ ok: false, kind: "too_large" });
  });

  it("maps an InvalidMimeType Storage error to unsupported_format", async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: { name: "StorageApiError", message: "bad type", status: 400, code: "InvalidMimeType" },
    });

    const result = await uploadCatalogPdf("store-a", pdfFile());

    expect(result).toEqual({ ok: false, kind: "unsupported_format" });
  });

  it("maps any other Storage error to service_error", async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: { name: "StorageApiError", message: "down", status: 500, code: "InternalError" },
    });

    const result = await uploadCatalogPdf("store-a", pdfFile());

    expect(result).toEqual({ ok: false, kind: "service_error" });
  });

  it("maps a Storage error with no code at all (unparseable gateway response) to service_error", async () => {
    uploadMock.mockResolvedValue({
      data: null,
      error: { name: "StorageApiError", message: "Request Entity Too Large" },
    });

    const result = await uploadCatalogPdf("store-a", pdfFile());

    expect(result).toEqual({ ok: false, kind: "service_error" });
  });
});
