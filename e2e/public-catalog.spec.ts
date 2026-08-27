import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import {
  getAdminStoreAccessFixture,
  hasConfiguredAdminStoreAccess,
  hasConfiguredSecondAdminStoreAccess,
} from "./fixtures/admin-store-access";
import { getProductImageFixture, hasConfiguredValidJpeg } from "./fixtures/product-management";
import {
  deleteHeroBanners,
  hasConfiguredBannerSeeding,
  seedHeroBanner,
} from "./fixtures/public-catalog";

// `Date.now()` alone collides across the desktop-chromium/mobile-chromium
// projects, which run concurrently against the same shared admin fixture's
// store. SKU carries a real store-wide uniqueness constraint, so it needs
// this (see e2e/product-management.spec.ts).
function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  const emailField = page.getByLabel("Email");
  const passwordField = page.getByLabel("Senha");
  await emailField.fill(email);
  await passwordField.fill(password);
  // Guard against the browser/OS credential autofill overwriting a field
  // after `.fill()` (see e2e/admin-store-access.spec.ts) — re-assert the
  // intended value right before submitting, one retry if it was clobbered.
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

async function openCreateForm(page: Page) {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Novo produto" }).click();
}

async function fillProductForm(
  page: Page,
  { name, quantity, imagePath }: { name: string; quantity: string; imagePath: string },
) {
  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("Descrição").fill("Descrição de teste E2E do catálogo público.");
  await page.getByLabel("Quantidade disponível").fill(quantity);
  await page.getByLabel("Imagem do produto").setInputFiles(imagePath);
  await expect(page.getByAltText("Pré-visualização da imagem do produto")).toBeVisible();
}

async function getAdminStore(page: Page): Promise<{ id: string; slug: string }> {
  const response = await page.request.get("/admin/store");
  expect(response.status()).toBe(200);
  return (await response.json()) as { id: string; slug: string };
}

async function uploadBannerAsset(page: Page, imagePath: string): Promise<{ id: string }> {
  const response = await page.request.post("/admin/assets", {
    multipart: {
      file: {
        name: "banner.jpg",
        mimeType: "image/jpeg",
        buffer: readFileSync(imagePath),
      },
      kind: "banner",
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as { id: string };
}

test.describe("public catalog", () => {
  // Serial: several tests create real products/banners against the shared
  // admin fixture's store and read them back through the public page.
  test.describe.configure({ mode: "serial" });

  test("shows each active and visible product with name, SKU, description, image and availability, without login", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) || !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const productName = `Produto público ${uniqueSuffix()}`;

    await openCreateForm(page);
    await page.getByLabel("Nome").fill(productName);
    await page.getByLabel("SKU (opcional)").fill(`SKU-PUB-${uniqueSuffix()}`);
    await page.getByLabel("Descrição").fill("Descrição de teste E2E do catálogo público.");
    await page.getByLabel("Quantidade disponível").fill("4");
    await page.getByLabel("Imagem do produto").setInputFiles(productImages.validJpegPath!);
    await expect(page.getByAltText("Pré-visualização da imagem do produto")).toBeVisible();
    await page.getByRole("button", { name: "Salvar produto" }).click();

    const item = page.getByRole("listitem").filter({ hasText: productName });
    await expect(item).toBeVisible();
    // Each toggle's PATCH must resolve before reading the public page, or the
    // catalog can be read before is_visible/is_orderable actually flipped.
    await item.getByRole("switch", { name: /Visível no catálogo/ }).click();
    await expect(item.getByRole("switch", { name: /Visível no catálogo: Ligado/ })).toBeVisible();
    await item.getByRole("switch", { name: /Disponível para pedido/ }).click();
    await expect(
      item.getByRole("switch", { name: /Disponível para pedido: Ligado/ }),
    ).toBeVisible();

    const store = await getAdminStore(page);

    await page.goto(`/${store.slug}`);

    // No login wall on the public catalog (FR-008), same assertion style as
    // e2e/admin-store-access.spec.ts's "public shell" test.
    await expect(page.getByLabel("Email")).toHaveCount(0);

    const card = page.getByRole("listitem").filter({ hasText: productName });
    await expect(card).toBeVisible();
    await expect(card.getByText(/SKU-PUB-/)).toBeVisible();
    await expect(card.getByText("Descrição de teste E2E do catálogo público.")).toBeVisible();
    await expect(card.getByRole("img", { name: `Imagem do produto ${productName}` })).toBeVisible();
    await expect(card.getByText("Disponível para pedido")).toBeVisible();
  });

  test("hides a product that is not visible or has been deactivated", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) || !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);

    const hiddenName = `Produto invisivel ${uniqueSuffix()}`;
    await openCreateForm(page);
    await fillProductForm(page, {
      name: hiddenName,
      quantity: "1",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: hiddenName })).toBeVisible();

    const deactivatedName = `Produto desativado ${uniqueSuffix()}`;
    await openCreateForm(page);
    await fillProductForm(page, {
      name: deactivatedName,
      quantity: "1",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();
    const deactivatedItem = page.getByRole("listitem").filter({ hasText: deactivatedName });
    await expect(deactivatedItem).toBeVisible();
    await deactivatedItem.getByRole("switch", { name: /Visível no catálogo/ }).click();
    await expect(
      deactivatedItem.getByRole("switch", { name: /Visível no catálogo: Ligado/ }),
    ).toBeVisible();
    await deactivatedItem.getByRole("button", { name: "Desativar" }).click();
    await expect(deactivatedItem.getByText("Desativado", { exact: true })).toBeVisible();

    const store = await getAdminStore(page);

    await page.goto(`/${store.slug}`);

    await expect(page.getByText(hiddenName)).toHaveCount(0);
    await expect(page.getByText(deactivatedName)).toHaveCount(0);
  });

  test("hides a product that belongs to another store", async ({ page }, testInfo) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "Runs once against the shared store B to avoid racing the empty-catalog test's read of the same store across projects.",
    );
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredSecondAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const storeA = await getAdminStore(page);

    await page.context().clearCookies();
    await signIn(page, adminStoreAccess.secondAdminEmail!, adminStoreAccess.secondAdminPassword!);

    const otherStoreProductName = `Produto da loja B ${uniqueSuffix()}`;
    await openCreateForm(page);
    await fillProductForm(page, {
      name: otherStoreProductName,
      quantity: "1",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();
    const item = page.getByRole("listitem").filter({ hasText: otherStoreProductName });
    await expect(item).toBeVisible();
    await item.getByRole("switch", { name: /Visível no catálogo/ }).click();
    await expect(item.getByRole("switch", { name: /Visível no catálogo: Ligado/ })).toBeVisible();

    const productId = (
      (await (await page.request.get("/admin/products")).json()) as {
        items: Array<{ id: string; name: string }>;
      }
    ).items.find((product) => product.name === otherStoreProductName)?.id;

    try {
      // Deliberately not clearing cookies: still holding store B's admin
      // session proves the public catalog ignores auth state entirely
      // (see getServerPublicSupabaseClient), not just that anon works.
      await page.goto(`/${storeA.slug}`);

      await expect(page.getByText(otherStoreProductName)).toHaveCount(0);
    } finally {
      // Store B is a shared fixture reused by every other spec file — leaving
      // a permanently visible product there would break "empty catalog"
      // scenarios elsewhere in the suite. Admin B's session is still active
      // (never cleared above), so no need to sign in again here.
      if (productId) {
        await page.request.delete(`/admin/products/${productId}`);
      }
    }
  });

  test("shows an empty-catalog state when the store has no published products", async ({
    page,
  }, testInfo) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "Runs once against the shared store B to avoid racing the cross-store test's writes to the same store across projects.",
    );
    test.skip(
      !hasConfiguredSecondAdminStoreAccess(adminStoreAccess),
      "Non-production second-admin fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.secondAdminEmail!, adminStoreAccess.secondAdminPassword!);
    const store = await getAdminStore(page);

    await page.goto(`/${store.slug}`);

    await expect(page.getByText("Nenhum produto disponível no momento")).toBeVisible();
  });

  test("shows a clear not-found message for a slug that matches no store", async ({ page }) => {
    await page.goto("/loja-que-nao-existe-e2e");

    await expect(page.getByRole("heading", { name: "Loja não encontrada" })).toBeVisible();
  });

  test("shows active banners at the top, ordered by position, with an accessible description", async ({
    page,
  }, testInfo) => {
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
      const assetOne = await uploadBannerAsset(page, productImages.validJpegPath!);
      const assetTwo = await uploadBannerAsset(page, productImages.validJpegPath!);

      // Seed out of order to prove the catalog orders by `position`, not by
      // insertion order.
      bannerIds.push(
        await seedHeroBanner({
          storeId: store.id,
          imageAssetId: assetTwo.id,
          accessibleDescription: `Banner acessível 2 ${suffix}`,
          title: `Título do segundo banner ${suffix}`,
          position: 2,
        }),
      );
      bannerIds.push(
        await seedHeroBanner({
          storeId: store.id,
          imageAssetId: assetOne.id,
          accessibleDescription: `Banner acessível 1 ${suffix}`,
          title: `Título do primeiro banner ${suffix}`,
          position: 1,
        }),
      );

      await page.goto(`/${store.slug}`);

      const region = page.getByRole("region", { name: "Destaques da loja" });
      await expect(region).toBeVisible();

      const images = region.getByRole("img");
      await expect(images).toHaveCount(2);
      await expect(images.nth(0)).toHaveAccessibleName(`Banner acessível 1 ${suffix}`);
      await expect(images.nth(1)).toHaveAccessibleName(`Banner acessível 2 ${suffix}`);
      await expect(region.getByText(`Título do primeiro banner ${suffix}`)).toBeVisible();
    } finally {
      await deleteHeroBanners(bannerIds);
    }
  });

  test("shows the catalog without a banner area when the store has no active banners", async ({
    page,
  }, testInfo) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "Runs once against the shared store to avoid racing the banner-ordering test above.",
    );
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const store = await getAdminStore(page);

    await page.goto(`/${store.slug}`);

    await expect(page.getByRole("region", { name: "Destaques da loja" })).toHaveCount(0);
  });
});
