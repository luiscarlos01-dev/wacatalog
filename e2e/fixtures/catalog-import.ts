import { existsSync } from "node:fs";

// The valid PDF fixture must contain at least three products: one of whose
// SKU exactly matches this constant — the test pre-creates a product with
// the same SKU to exercise the duplicate-detection scenario (spec.md US1
// acceptance scenario 2) — and at least two more, distinct, non-duplicate
// products, used by the correction/confirmation scenarios (US2) to exercise
// "one item fails, the others still succeed" (FR-010/FR-013).
export const CATALOG_IMPORT_KNOWN_DUPLICATE_SKU = "E2E-CATALOG-IMPORT-DUP";

export type CatalogImportPdfFixture = {
  validPdfPath: string | undefined;
  scannedPdfPath: string | undefined;
  corruptedPdfPath: string | undefined;
  oversizedPdfPath: string | undefined;
};

function isConfiguredPath(path: string | undefined): path is string {
  return path !== undefined && path.trim().length > 0 && existsSync(path);
}

export function hasConfiguredValidPdf(
  fixture: CatalogImportPdfFixture,
): fixture is CatalogImportPdfFixture & { validPdfPath: string } {
  return isConfiguredPath(fixture.validPdfPath);
}

export function hasConfiguredScannedPdf(
  fixture: CatalogImportPdfFixture,
): fixture is CatalogImportPdfFixture & { scannedPdfPath: string } {
  return isConfiguredPath(fixture.scannedPdfPath);
}

export function hasConfiguredCorruptedPdf(
  fixture: CatalogImportPdfFixture,
): fixture is CatalogImportPdfFixture & { corruptedPdfPath: string } {
  return isConfiguredPath(fixture.corruptedPdfPath);
}

export function hasConfiguredOversizedPdf(
  fixture: CatalogImportPdfFixture,
): fixture is CatalogImportPdfFixture & { oversizedPdfPath: string } {
  return isConfiguredPath(fixture.oversizedPdfPath);
}

export function getCatalogImportPdfFixture(): CatalogImportPdfFixture {
  return {
    validPdfPath: process.env.E2E_CATALOG_IMPORT_VALID_PDF_PATH,
    scannedPdfPath: process.env.E2E_CATALOG_IMPORT_SCANNED_PDF_PATH,
    corruptedPdfPath: process.env.E2E_CATALOG_IMPORT_CORRUPTED_PDF_PATH,
    oversizedPdfPath: process.env.E2E_CATALOG_IMPORT_OVERSIZED_PDF_PATH,
  };
}
