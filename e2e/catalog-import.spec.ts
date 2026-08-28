import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  getAdminStoreAccessFixture,
  hasConfiguredAdminStoreAccess,
  hasConfiguredSecondAdminStoreAccess,
} from "./fixtures/admin-store-access";
import { getProductImageFixture, hasConfiguredValidJpeg } from "./fixtures/product-management";
import {
  CATALOG_IMPORT_KNOWN_DUPLICATE_SKU,
  getCatalogImportPdfFixture,
  hasConfiguredCorruptedPdf,
  hasConfiguredOversizedPdf,
  hasConfiguredScannedPdf,
  hasConfiguredValidPdf,
} from "./fixtures/catalog-import";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  const emailField = page.getByLabel("Email");
  const passwordField = page.getByLabel("Senha");
  await emailField.fill(email);
  await passwordField.fill(password);
  if ((await emailField.inputValue()) !== email) {
    await emailField.fill(email);
  }
  if ((await passwordField.inputValue()) !== password) {
    await passwordField.fill(password);
  }
  await expect(emailField).toHaveValue(email);
  await expect(passwordField).toHaveValue(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/admin$/, { timeout: 8000 });
}

async function openImportPanel(page: Page) {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Importar catálogo (PDF)" }).click();
}

async function submitPdf(page: Page, pdfPath: string) {
  await page.getByLabel("Arquivo PDF do catálogo").setInputFiles(pdfPath);
  await page.getByRole("button", { name: "Enviar PDF" }).click();
}

// Scopes to the non-duplicate candidates: the duplicate one renders as
// read-only (no editable fields, no image input) and must never be targeted
// by the correction/confirmation scenarios (US2).
function nonDuplicateItems(preview: Locator, duplicateSku: string) {
  return preview.getByRole("listitem").filter({ hasNotText: duplicateSku });
}

async function attachImage(item: Locator, imagePath: string) {
  await item.getByLabel("Imagem do produto").setInputFiles(imagePath);
  await expect(item.getByRole("img")).toBeVisible();
}

// Ensures a product with the fixture's known-duplicate SKU exists in the
// signed-in admin's store, so the valid-PDF fixture's matching candidate is
// exercised as a real duplicate (spec.md US1 acceptance scenario 2).
async function ensureKnownDuplicateProductExists(page: Page, imagePath: string) {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Novo produto" }).click();
  await page.getByLabel("Nome").fill(`Produto E2E duplicado ${Date.now()}`);
  await page.getByLabel("SKU (opcional)").fill(CATALOG_IMPORT_KNOWN_DUPLICATE_SKU);
  await page.getByLabel("Descrição").fill("Pré-existente para o teste de duplicidade.");
  await page.getByLabel("Quantidade disponível").fill("1");
  await page.getByLabel("Imagem do produto").setInputFiles(imagePath);
  await expect(page.getByAltText("Pré-visualização da imagem do produto")).toBeVisible();
  await page.getByRole("button", { name: "Salvar produto" }).click();
  await expect(
    page
      .getByRole("list", { name: "Produtos cadastrados" })
      .getByText(CATALOG_IMPORT_KNOWN_DUPLICATE_SKU, {
        exact: false,
      }),
  ).toBeVisible();
}

test.describe("catalog import", () => {
  // Serial: the duplicate-SKU scenario depends on a product created by an
  // earlier test in this same file, against the shared admin fixture's store.
  test.describe.configure({ mode: "serial" });

  test("uploading a valid PDF shows a preview with the extracted candidates, flagging the known-duplicate SKU", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    const catalogImportPdfs = getCatalogImportPdfFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredValidJpeg(productImages) ||
        !hasConfiguredValidPdf(catalogImportPdfs),
      "Non-production admin/image/PDF fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await ensureKnownDuplicateProductExists(page, productImages.validJpegPath!);

    await openImportPanel(page);
    await submitPdf(page, catalogImportPdfs.validPdfPath!);

    const preview = page.getByRole("list", { name: "Produtos extraídos do PDF" });
    await expect(preview).toBeVisible();
    await expect(preview.getByRole("listitem").first()).toBeVisible();

    const duplicateItem = preview
      .getByRole("listitem")
      .filter({ hasText: CATALOG_IMPORT_KNOWN_DUPLICATE_SKU });
    await expect(duplicateItem).toBeVisible();
    await expect(duplicateItem.getByText("SKU já cadastrado")).toBeVisible();
  });

  test("uploading a corrupted file shows a clear error, without a preview or catalog change", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const catalogImportPdfs = getCatalogImportPdfFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredCorruptedPdf(catalogImportPdfs),
      "Non-production admin/corrupted-PDF fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await openImportPanel(page);
    await submitPdf(page, catalogImportPdfs.corruptedPdfPath!);

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("list", { name: "Produtos extraídos do PDF" })).toHaveCount(0);
  });

  test("uploading a text-less (scanned) PDF shows a clear 'nothing found' message, not a technical error", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const catalogImportPdfs = getCatalogImportPdfFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredScannedPdf(catalogImportPdfs),
      "Non-production admin/scanned-PDF fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await openImportPanel(page);
    await submitPdf(page, catalogImportPdfs.scannedPdfPath!);

    await expect(page.getByText("Nenhum produto foi encontrado neste PDF.")).toBeVisible();
  });

  test("uploading a file above the size/page limit is rejected with a clear message before processing", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const catalogImportPdfs = getCatalogImportPdfFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredOversizedPdf(catalogImportPdfs),
      "Non-production admin/oversized-PDF fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await openImportPanel(page);
    await submitPdf(page, catalogImportPdfs.oversizedPdfPath!);

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("list", { name: "Produtos extraídos do PDF" })).toHaveCount(0);
  });

  test("correcting a field before confirming creates the product with the corrected value", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    const catalogImportPdfs = getCatalogImportPdfFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredValidJpeg(productImages) ||
        !hasConfiguredValidPdf(catalogImportPdfs),
      "Non-production admin/image/PDF fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await openImportPanel(page);
    await submitPdf(page, catalogImportPdfs.validPdfPath!);

    const preview = page.getByRole("list", { name: "Produtos extraídos do PDF" });
    const item = nonDuplicateItems(preview, CATALOG_IMPORT_KNOWN_DUPLICATE_SKU).first();
    const correctedName = `Produto E2E corrigido ${Date.now()}`;
    await item.getByLabel("Nome").fill(correctedName);
    await attachImage(item, productImages.validJpegPath!);

    await page.getByRole("button", { name: "Confirmar importação" }).click();
    await expect(item.getByText("Produto criado com sucesso.")).toBeVisible();

    const created = page
      .getByRole("list", { name: "Produtos cadastrados" })
      .getByRole("listitem")
      .filter({ hasText: correctedName });
    await expect(created).toBeVisible();
  });

  test("confirming without an image attached is blocked for that item", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const catalogImportPdfs = getCatalogImportPdfFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) || !hasConfiguredValidPdf(catalogImportPdfs),
      "Non-production admin/PDF fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await openImportPanel(page);
    await submitPdf(page, catalogImportPdfs.validPdfPath!);

    const preview = page.getByRole("list", { name: "Produtos extraídos do PDF" });
    const item = nonDuplicateItems(preview, CATALOG_IMPORT_KNOWN_DUPLICATE_SKU).first();

    await page.getByRole("button", { name: "Confirmar importação" }).click();
    await expect(item.getByText("Anexe uma imagem para confirmar este item.")).toBeVisible();
  });

  test("confirming creates exactly the non-duplicate items with an image, and leaves the duplicate untouched", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    const catalogImportPdfs = getCatalogImportPdfFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredValidJpeg(productImages) ||
        !hasConfiguredValidPdf(catalogImportPdfs),
      "Non-production admin/image/PDF fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await openImportPanel(page);
    await submitPdf(page, catalogImportPdfs.validPdfPath!);

    const preview = page.getByRole("list", { name: "Produtos extraídos do PDF" });
    const targets = nonDuplicateItems(preview, CATALOG_IMPORT_KNOWN_DUPLICATE_SKU);
    const targetCount = await targets.count();

    for (let index = 0; index < targetCount; index += 1) {
      await attachImage(targets.nth(index), productImages.validJpegPath!);
    }

    await page.getByRole("button", { name: "Confirmar importação" }).click();
    await expect(page.getByText(`${targetCount} produto(s) criado(s) com sucesso.`)).toBeVisible();
    await expect(page.getByText("1 item(ns) ignorado(s) por SKU já cadastrado.")).toBeVisible();

    const registeredProducts = page.getByRole("list", { name: "Produtos cadastrados" });
    await expect(
      registeredProducts
        .getByRole("listitem")
        .filter({ hasText: CATALOG_IMPORT_KNOWN_DUPLICATE_SKU }),
    ).toHaveCount(1);

    const newlyCreated = registeredProducts
      .getByRole("listitem")
      .filter({ has: page.getByRole("switch", { name: /Visível no catálogo: Desligado/ }) });
    await expect(newlyCreated.first()).toBeVisible();
  });

  test("an invalid field on one item does not block confirming the other valid items", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    const catalogImportPdfs = getCatalogImportPdfFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredValidJpeg(productImages) ||
        !hasConfiguredValidPdf(catalogImportPdfs),
      "Non-production admin/image/PDF fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await openImportPanel(page);
    await submitPdf(page, catalogImportPdfs.validPdfPath!);

    const preview = page.getByRole("list", { name: "Produtos extraídos do PDF" });
    const targets = nonDuplicateItems(preview, CATALOG_IMPORT_KNOWN_DUPLICATE_SKU);
    const targetCount = await targets.count();
    test.skip(targetCount < 2, "Valid PDF fixture needs at least two non-duplicate products.");

    for (let index = 0; index < targetCount; index += 1) {
      await attachImage(targets.nth(index), productImages.validJpegPath!);
    }
    await targets.nth(0).getByLabel("Nome").fill("");

    await page.getByRole("button", { name: "Confirmar importação" }).click();

    await expect(
      targets.nth(0).getByText("Preencha nome e descrição para confirmar este item."),
    ).toBeVisible();
    await expect(targets.nth(1).getByText("Produto criado com sucesso.")).toBeVisible();
  });

  test("an administrator from another store never sees the import flagged as duplicate against the first store", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const catalogImportPdfs = getCatalogImportPdfFixture();
    test.skip(
      !hasConfiguredSecondAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredValidPdf(catalogImportPdfs),
      "Non-production second-admin/PDF fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.secondAdminEmail!, adminStoreAccess.secondAdminPassword!);
    await openImportPanel(page);
    await submitPdf(page, catalogImportPdfs.validPdfPath!);

    const preview = page.getByRole("list", { name: "Produtos extraídos do PDF" });
    const duplicateItem = preview
      .getByRole("listitem")
      .filter({ hasText: CATALOG_IMPORT_KNOWN_DUPLICATE_SKU });
    await expect(duplicateItem).toBeVisible();
    await expect(duplicateItem.getByText("SKU já cadastrado")).toHaveCount(0);
  });

  test("canceling the import before confirming leaves the catalog unchanged", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const catalogImportPdfs = getCatalogImportPdfFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) || !hasConfiguredValidPdf(catalogImportPdfs),
      "Non-production admin/PDF fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const registeredProducts = page.getByRole("list", { name: "Produtos cadastrados" });
    const countBefore = await registeredProducts.getByRole("listitem").count();

    await openImportPanel(page);
    await submitPdf(page, catalogImportPdfs.validPdfPath!);
    const preview = page.getByRole("list", { name: "Produtos extraídos do PDF" });
    await preview.waitFor();
    // spec.md US3 scenario 1: canceling behaves the same whether or not a
    // correction was made first — edit a field here to exercise that.
    await nonDuplicateItems(preview, CATALOG_IMPORT_KNOWN_DUPLICATE_SKU)
      .first()
      .getByLabel("Nome")
      .fill("Nome editado antes de cancelar");
    await page.getByRole("button", { name: "Cancelar importação" }).click();

    await expect(page.getByRole("button", { name: "Importar catálogo (PDF)" })).toBeVisible();
    await expect(registeredProducts.getByRole("listitem")).toHaveCount(countBefore);
  });
});
