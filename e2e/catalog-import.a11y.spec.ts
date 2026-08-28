import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  getAdminStoreAccessFixture,
  hasConfiguredAdminStoreAccess,
} from "./fixtures/admin-store-access";
import {
  CATALOG_IMPORT_KNOWN_DUPLICATE_SKU,
  getCatalogImportPdfFixture,
  hasConfiguredCorruptedPdf,
  hasConfiguredValidPdf,
} from "./fixtures/catalog-import";

type ContrastMode = "text" | "border" | "ring";

// Mirrors e2e/product-management.a11y.spec.ts's own copy — this repo's
// convention is one self-contained a11y spec per feature, not a shared util.
async function getContrastRatio(locator: Locator, mode: ContrastMode = "text"): Promise<number> {
  return locator.evaluate((element, evaluatedMode) => {
    function resolveToRgba(value: string): [number, number, number, number] {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return [255, 255, 255, 1];
      }
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    }

    function relativeLuminance([r, g, b]: [number, number, number]): number {
      const channel = (value: number) => {
        const normalized = value / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    }

    function effectiveBackground(node: Element | null): [number, number, number] {
      let current = node;
      while (current) {
        const [r, g, b, a] = resolveToRgba(getComputedStyle(current).backgroundColor);
        if (a >= 0.999) {
          return [r, g, b];
        }
        current = current.parentElement;
      }
      return [255, 255, 255];
    }

    const style = getComputedStyle(element);
    const foreground =
      evaluatedMode === "border"
        ? resolveToRgba(style.borderTopColor)
        : evaluatedMode === "ring"
          ? resolveToRgba(style.getPropertyValue("--tw-ring-color") || "rgb(255, 255, 255)")
          : resolveToRgba(style.color);
    const backgroundNode = evaluatedMode === "text" ? element : element.parentElement;
    const [br, bg, bb] = effectiveBackground(backgroundNode);

    const foregroundLuminance = relativeLuminance([foreground[0], foreground[1], foreground[2]]);
    const backgroundLuminance = relativeLuminance([br, bg, bb]);
    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);

    return (lighter + 0.05) / (darker + 0.05);
  }, mode);
}

function parseDurationsToSeconds(value: string): number[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) =>
      part.endsWith("ms") ? Number.parseFloat(part) / 1000 : Number.parseFloat(part),
    );
}

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

test.describe("catalog import accessibility", () => {
  test("the upload form is keyboard reachable with visible focus", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");
    await page.getByRole("button", { name: "Importar catálogo (PDF)" }).click();

    const fileField = page.getByLabel("Arquivo PDF do catálogo");
    await fileField.focus();
    await expect(fileField).toBeFocused();
    await expect(fileField).not.toHaveCSS("box-shadow", "none");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Enviar PDF" })).toBeFocused();
    await page.keyboard.press("Tab");
    const cancelButton = page.getByRole("button", { name: "Cancelar" });
    await expect(cancelButton).toBeFocused();
    await expect(cancelButton).not.toHaveCSS("box-shadow", "none");
  });

  test("the import panel renders on a mobile viewport", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");
    await page.getByRole("button", { name: "Importar catálogo (PDF)" }).click();

    await expect(page.getByLabel("Arquivo PDF do catálogo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar PDF" })).toBeVisible();
  });

  test("the import trigger and error alert meet WCAG 2.2 AA contrast", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const catalogImportPdfs = getCatalogImportPdfFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredCorruptedPdf(catalogImportPdfs),
      "Non-production admin/corrupted-PDF fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");

    await expect(
      await getContrastRatio(page.getByRole("button", { name: "Importar catálogo (PDF)" })),
    ).toBeGreaterThanOrEqual(4.5);

    await page.getByRole("button", { name: "Importar catálogo (PDF)" }).click();
    await page
      .getByLabel("Arquivo PDF do catálogo")
      .setInputFiles(catalogImportPdfs.corruptedPdfPath!);
    await page.getByRole("button", { name: "Enviar PDF" }).click();

    await expect(await getContrastRatio(page.getByRole("alert"))).toBeGreaterThanOrEqual(4.5);
  });

  test("the duplicate badge and review list meet WCAG 2.2 AA contrast", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const catalogImportPdfs = getCatalogImportPdfFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) || !hasConfiguredValidPdf(catalogImportPdfs),
      "Non-production admin/PDF fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");
    await page.getByRole("button", { name: "Importar catálogo (PDF)" }).click();
    await page.getByLabel("Arquivo PDF do catálogo").setInputFiles(catalogImportPdfs.validPdfPath!);
    await page.getByRole("button", { name: "Enviar PDF" }).click();

    const preview = page.getByRole("list", { name: "Produtos extraídos do PDF" });
    await expect(preview).toBeVisible();

    const duplicateItem = preview
      .getByRole("listitem")
      .filter({ hasText: CATALOG_IMPORT_KNOWN_DUPLICATE_SKU });
    test.skip(
      (await duplicateItem.count()) === 0,
      "Valid PDF fixture did not include the known-duplicate SKU (no pre-existing product to match against in this run).",
    );

    await expect(
      await getContrastRatio(duplicateItem.getByText("SKU já cadastrado")),
    ).toBeGreaterThanOrEqual(4.5);
    await expect(
      await getContrastRatio(page.getByRole("button", { name: "Confirmar importação" })),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test("transitions collapse to near-zero when reduced motion is preferred", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await page.emulateMedia({ reducedMotion: "reduce" });
    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");

    const importButton = page.getByRole("button", { name: "Importar catálogo (PDF)" });
    await importButton.focus();

    const durations = await importButton.evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    );

    for (const duration of parseDurationsToSeconds(durations)) {
      expect(duration).toBeLessThanOrEqual(0.05);
    }
  });
});
