import { existsSync } from "node:fs";

export type ProductImageFixture = {
  validJpegPath: string | undefined;
  validHeicPath: string | undefined;
  // ADR-0009: above Vercel's 4.5 MB Function body cap, below ADR-0003's
  // 10 MB limit — the exact range that silently failed in production
  // before the direct-to-Storage transport fix.
  midSizeJpegPath: string | undefined;
  oversizedPath: string | undefined;
  unsupportedFormatPath: string | undefined;
};

function isConfiguredPath(path: string | undefined): path is string {
  return path !== undefined && path.trim().length > 0 && existsSync(path);
}

export function hasConfiguredValidJpeg(
  fixture: ProductImageFixture,
): fixture is ProductImageFixture & { validJpegPath: string } {
  return isConfiguredPath(fixture.validJpegPath);
}

export function hasConfiguredValidHeic(
  fixture: ProductImageFixture,
): fixture is ProductImageFixture & { validHeicPath: string } {
  return isConfiguredPath(fixture.validHeicPath);
}

export function hasConfiguredMidSizeJpeg(
  fixture: ProductImageFixture,
): fixture is ProductImageFixture & { midSizeJpegPath: string } {
  return isConfiguredPath(fixture.midSizeJpegPath);
}

export function hasConfiguredOversizedFile(
  fixture: ProductImageFixture,
): fixture is ProductImageFixture & { oversizedPath: string } {
  return isConfiguredPath(fixture.oversizedPath);
}

export function hasConfiguredUnsupportedFormat(
  fixture: ProductImageFixture,
): fixture is ProductImageFixture & { unsupportedFormatPath: string } {
  return isConfiguredPath(fixture.unsupportedFormatPath);
}

export function getProductImageFixture(): ProductImageFixture {
  return {
    validJpegPath: process.env.E2E_PRODUCT_IMAGE_VALID_JPEG_PATH,
    validHeicPath: process.env.E2E_PRODUCT_IMAGE_VALID_HEIC_PATH,
    midSizeJpegPath: process.env.E2E_PRODUCT_IMAGE_MID_SIZE_JPEG_PATH,
    oversizedPath: process.env.E2E_PRODUCT_IMAGE_OVERSIZED_PATH,
    unsupportedFormatPath: process.env.E2E_PRODUCT_IMAGE_UNSUPPORTED_FORMAT_PATH,
  };
}
