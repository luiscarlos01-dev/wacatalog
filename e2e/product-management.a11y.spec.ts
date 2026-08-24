import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  getAdminStoreAccessFixture,
  hasConfiguredAdminStoreAccess,
} from "./fixtures/admin-store-access";
import { getProductImageFixture, hasConfiguredValidJpeg } from "./fixtures/product-management";

type ContrastMode = "text" | "border" | "ring";

async function getContrastRatio(locator: Locator, mode: ContrastMode = "text"): Promise<number> {
  return locator.evaluate((element, evaluatedMode) => {
    // Tailwind v4 computed colors serialize as oklch()/color(), not rgb(); resolving
    // through a canvas fillStyle normalizes any CSS color syntax to concrete sRGB.
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
  // Guard against the browser/OS credential autofill overwriting a field after
  // `.fill()` (see e2e/admin-store-access.spec.ts) — re-assert the intended
  // value right before submitting, one retry if it was clobbered.
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

test.describe("product management accessibility", () => {
  test("the create form is keyboard reachable with visible focus", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");

    await page.getByRole("button", { name: "Novo produto" }).click();
    const nameField = page.locator("#product-name");
    await nameField.focus();
    await expect(nameField).toBeFocused();
    // Focus indicator is a box-shadow ring (`focus:ring-*`), not the native
    // outline, matching the convention already established in login-form.tsx.
    await expect(nameField).not.toHaveCSS("box-shadow", "none");

    await page.keyboard.press("Tab");
    await expect(page.locator("#product-sku")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#product-description")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#product-quantity")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#product-image")).toBeFocused();
  });

  test("the products page renders on a mobile viewport", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");

    await expect(page.getByRole("heading", { name: "Produtos cadastrados" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Novo produto" })).toBeVisible();
  });

  test("products page text and state badges meet WCAG 2.2 AA contrast", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) || !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");

    // Large text (>=24px): 3:1 minimum. The store name h1 (text-3xl) is dynamic
    // fixture data, so it's targeted by role/level rather than a fixed string.
    await expect(
      await getContrastRatio(page.getByRole("heading", { level: 1 })),
    ).toBeGreaterThanOrEqual(3);

    // Normal text: 4.5:1 minimum.
    await expect(
      await getContrastRatio(page.getByRole("button", { name: "Novo produto" })),
    ).toBeGreaterThanOrEqual(4.5);

    const productName = `Produto contraste ${Date.now()}`;
    await page.getByRole("button", { name: "Novo produto" }).click();
    await page.getByLabel("Nome").fill(productName);
    await page.getByLabel("Descrição").fill("Descrição de teste E2E.");
    await page.getByLabel("Quantidade disponível").fill("1");
    await page.getByLabel("Imagem do produto").setInputFiles(productImages.validJpegPath!);
    await expect(page.getByAltText("Pré-visualização da imagem do produto")).toBeVisible();
    await page.getByRole("button", { name: "Salvar produto" }).click();

    const item = page.getByRole("listitem").filter({ hasText: productName });
    await expect(item).toBeVisible();
    await expect(
      await getContrastRatio(item.getByText("Ativo", { exact: true })),
    ).toBeGreaterThanOrEqual(4.5);
    await expect(
      await getContrastRatio(item.getByRole("switch", { name: /Visível no catálogo/ })),
    ).toBeGreaterThanOrEqual(4.5);
    await expect(
      await getContrastRatio(item.getByRole("button", { name: "Excluir" })),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test("the delete confirmation dialog meets contrast and keeps visible focus", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) || !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");

    const productName = `Produto diálogo ${Date.now()}`;
    await page.getByRole("button", { name: "Novo produto" }).click();
    await page.getByLabel("Nome").fill(productName);
    await page.getByLabel("Descrição").fill("Descrição de teste E2E.");
    await page.getByLabel("Quantidade disponível").fill("1");
    await page.getByLabel("Imagem do produto").setInputFiles(productImages.validJpegPath!);
    await expect(page.getByAltText("Pré-visualização da imagem do produto")).toBeVisible();
    await page.getByRole("button", { name: "Salvar produto" }).click();

    const item = page.getByRole("listitem").filter({ hasText: productName });
    await item.getByRole("button", { name: "Excluir" }).click();

    const cancelButton = page.getByRole("button", { name: "Cancelar" });
    await expect(cancelButton).toBeFocused();
    await expect(cancelButton).not.toHaveCSS("box-shadow", "none");
    await expect(
      await getContrastRatio(page.getByRole("heading", { name: "Excluir produto" })),
    ).toBeGreaterThanOrEqual(3);
    await expect(
      await getContrastRatio(page.getByRole("button", { name: "Excluir definitivamente" })),
    ).toBeGreaterThanOrEqual(4.5);

    await page.keyboard.press("Escape");
    await expect(item).toBeVisible();
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

    const createButton = page.getByRole("button", { name: "Novo produto" });
    await createButton.focus();

    const durations = await createButton.evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    );

    for (const duration of parseDurationsToSeconds(durations)) {
      expect(duration).toBeLessThanOrEqual(0.05);
    }
  });
});
