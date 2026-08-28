import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/features/assets/upload-raw-image", () => ({
  uploadRawImage: vi.fn(),
}));

const { uploadRawImage } = await import("@/features/assets/upload-raw-image");
const { uploadProductImage } = await import("@/features/assets/upload-product-image");
const uploadRawImageMock = vi.mocked(uploadRawImage);

function jpegFile(): File {
  return new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });
}

describe("uploadProductImage", () => {
  beforeEach(() => {
    uploadRawImageMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("propagates a too_large failure from the Storage upload step without calling the route", async () => {
    uploadRawImageMock.mockResolvedValue({ ok: false, kind: "too_large" });

    const result = await uploadProductImage("store-a", jpegFile());

    expect(result).toEqual({ ok: false, kind: "too_large" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("propagates an unsupported_format failure from the Storage upload step without calling the route", async () => {
    uploadRawImageMock.mockResolvedValue({ ok: false, kind: "unsupported_format" });

    const result = await uploadProductImage("store-a", jpegFile());

    expect(result).toEqual({ ok: false, kind: "unsupported_format" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports a service error and skips the route call when the Storage upload fails generically", async () => {
    uploadRawImageMock.mockResolvedValue({ ok: false, kind: "service_error" });

    const result = await uploadProductImage("store-a", jpegFile());

    expect(result).toEqual({ ok: false, kind: "service_error" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls the route with the uploaded storagePath and returns the created asset", async () => {
    uploadRawImageMock.mockResolvedValue({ ok: true, storagePath: "store-a/uuid" });
    vi.mocked(fetch).mockResolvedValue({
      status: 201,
      json: async () => ({ id: "asset-1" }),
    } as Response);

    const result = await uploadProductImage("store-a", jpegFile());

    expect(result).toEqual({ ok: true, asset: { id: "asset-1" } });
    expect(fetch).toHaveBeenCalledWith(
      "/admin/assets",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ storagePath: "store-a/uuid", kind: "product" }),
      }),
    );
  });

  it("maps a 413 from the route to too_large", async () => {
    uploadRawImageMock.mockResolvedValue({ ok: true, storagePath: "store-a/uuid" });
    vi.mocked(fetch).mockResolvedValue({ status: 413 } as Response);

    const result = await uploadProductImage("store-a", jpegFile());

    expect(result).toEqual({ ok: false, kind: "too_large" });
  });

  it("maps a 415 from the route to unsupported_format", async () => {
    uploadRawImageMock.mockResolvedValue({ ok: true, storagePath: "store-a/uuid" });
    vi.mocked(fetch).mockResolvedValue({ status: 415 } as Response);

    const result = await uploadProductImage("store-a", jpegFile());

    expect(result).toEqual({ ok: false, kind: "unsupported_format" });
  });

  it("reports a service error when the route call itself throws", async () => {
    uploadRawImageMock.mockResolvedValue({ ok: true, storagePath: "store-a/uuid" });
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));

    const result = await uploadProductImage("store-a", jpegFile());

    expect(result).toEqual({ ok: false, kind: "service_error" });
  });
});
