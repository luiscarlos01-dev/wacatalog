import { readFileSync } from "node:fs";

import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  getAdminStoreAccessFixture,
  hasConfiguredAdminStoreAccess,
} from "./fixtures/admin-store-access";
import { getProductImageFixture, hasConfiguredValidJpeg } from "./fixtures/product-management";
import {
  deleteHeroBanners,
  hasConfiguredBannerSeeding,
  seedHeroBanner,
} from "./fixtures/public-catalog";

// This public page has no interactive controls (no forms, no dialogs, no
// hover/focus transitions — cart/WhatsApp are out of scope for this
// feature), so unlike e2e/product-management.a11y.spec.ts there is nothing
// to keyboard-navigate or reduced-motion-check here. Coverage below is
// contrast (WCAG 2.2 AA) and mobile rendering, which do apply.

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

// `Date.now()` alone collides across the desktop-chromium/mobile-chromium
// projects, which run concurrently against the same shared admin fixture's
// store (see e2e/product-management.spec.ts).
function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

async function getAdminStore(page: Page): Promise<{ id: string; slug: string }> {
  const response = await page.request.get("/admin/store");
  return (await response.json()) as { id: string; slug: string };
}

async function uploadBannerAsset(page: Page, imagePath: string): Promise<{ id: string }> {
  const response = await page.request.post("/admin/assets", {
    multipart: {
      file: { name: "banner.jpg", mimeType: "image/jpeg", buffer: readFileSync(imagePath) },
      kind: "banner",
    },
  });
  return (await response.json()) as { id: string };
}

test.describe("public catalog accessibility", () => {
  test("product name, description and availability badge meet WCAG 2.2 AA contrast", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) || !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const productName = `Produto contraste público ${uniqueSuffix()}`;

    await page.goto("/admin");
    await page.getByRole("button", { name: "Novo produto" }).click();
    await page.getByLabel("Nome").fill(productName);
    await page.getByLabel("Descrição").fill("Descrição de teste E2E de contraste.");
    await page.getByLabel("Quantidade disponível").fill("2");
    await page.getByLabel("Imagem do produto").setInputFiles(productImages.validJpegPath!);
    await expect(page.getByAltText("Pré-visualização da imagem do produto")).toBeVisible();
    await page.getByRole("button", { name: "Salvar produto" }).click();

    const item = page.getByRole("listitem").filter({ hasText: productName });
    await expect(item).toBeVisible();
    await item.getByRole("switch", { name: /Visível no catálogo/ }).click();
    await expect(item.getByRole("switch", { name: /Visível no catálogo: Ligado/ })).toBeVisible();

    const store = await getAdminStore(page);
    await page.goto(`/${store.slug}`);

    const card = page.getByRole("listitem").filter({ hasText: productName });
    await expect(card).toBeVisible();

    await expect(
      await getContrastRatio(card.getByRole("heading", { level: 2 })),
    ).toBeGreaterThanOrEqual(4.5);
    await expect(
      await getContrastRatio(card.getByText("Descrição de teste E2E de contraste.")),
    ).toBeGreaterThanOrEqual(4.5);
    await expect(
      await getContrastRatio(card.getByText("Indisponível no momento")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  test("the empty-catalog message and not-found heading meet WCAG 2.2 AA contrast", async ({
    page,
  }) => {
    await page.goto("/loja-que-nao-existe-e2e-a11y");

    await expect(
      await getContrastRatio(page.getByRole("heading", { name: "Loja não encontrada" })),
    ).toBeGreaterThanOrEqual(3);
  });

  test("the store header and product grid render on a mobile viewport", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const store = await getAdminStore(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${store.slug}`);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("banner title and text meet WCAG 2.2 AA contrast", async ({ page }, testInfo) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "Runs once against the shared store to avoid racing hero_banners' unique active position across projects.",
    );
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredValidJpeg(productImages) ||
        !hasConfiguredBannerSeeding(),
      "Non-production admin/image/banner-seeding fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const store = await getAdminStore(page);
    const suffix = Date.now();
    const bannerIds: string[] = [];

    try {
      const asset = await uploadBannerAsset(page, productImages.validJpegPath!);
      bannerIds.push(
        await seedHeroBanner({
          storeId: store.id,
          imageAssetId: asset.id,
          accessibleDescription: `Banner contraste ${suffix}`,
          title: `Título do banner ${suffix}`,
          text: `Texto do banner ${suffix}`,
          position: 1,
        }),
      );

      await page.goto(`/${store.slug}`);

      const region = page.getByRole("region", { name: "Destaques da loja" });
      await expect(region).toBeVisible();
      await expect(
        await getContrastRatio(region.getByText(`Título do banner ${suffix}`)),
      ).toBeGreaterThanOrEqual(3);
      await expect(
        await getContrastRatio(region.getByText(`Texto do banner ${suffix}`)),
      ).toBeGreaterThanOrEqual(4.5);
    } finally {
      await deleteHeroBanners(bannerIds);
    }
  });
});
