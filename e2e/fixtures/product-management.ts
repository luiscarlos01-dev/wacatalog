import { existsSync } from "node:fs";

export type ProductImageFixture = {
  validJpegPath: string | undefined;
  validHeicPath: string | undefined;
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
    oversizedPath: process.env.E2E_PRODUCT_IMAGE_OVERSIZED_PATH,
    unsupportedFormatPath: process.env.E2E_PRODUCT_IMAGE_UNSUPPORTED_FORMAT_PATH,
  };
}
