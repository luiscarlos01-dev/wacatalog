import { expect, test, type Page } from "@playwright/test";

import {
  getAdminStoreAccessFixture,
  hasConfiguredAdminStoreAccess,
  hasConfiguredSecondAdminStoreAccess,
} from "./fixtures/admin-store-access";
import {
  getProductImageFixture,
  hasConfiguredOversizedFile,
  hasConfiguredUnsupportedFormat,
  hasConfiguredValidJpeg,
} from "./fixtures/product-management";

type AdminProduct = {
  id: string;
  name: string;
  sku: string | null;
  quantityAvailable: number;
  isVisible: boolean;
  isOrderable: boolean;
  isActive: boolean;
};

// `Date.now()` alone collides across the desktop-chromium/mobile-chromium
// projects, which run concurrently against the same shared admin fixture's
// store (each project's own "serial" mode only orders tests within itself).
// SKU carries a real store-wide uniqueness constraint, so it needs this.
function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

async function openCreateForm(page: Page) {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Novo produto" }).click();
}

async function fillProductForm(
  page: Page,
  {
    name,
    sku,
    description = "Descrição de teste E2E.",
    quantity,
    imagePath,
  }: { name: string; sku?: string; description?: string; quantity: string; imagePath: string },
) {
  await page.getByLabel("Nome").fill(name);
  if (sku) {
    await page.getByLabel("SKU (opcional)").fill(sku);
  }
  await page.getByLabel("Descrição").fill(description);
  await page.getByLabel("Quantidade disponível").fill(quantity);
  await page.getByLabel("Imagem do produto").setInputFiles(imagePath);
  await expect(page.getByAltText("Pré-visualização da imagem do produto")).toBeVisible();
}

async function listProductsViaApi(page: Page): Promise<AdminProduct[]> {
  const response = await page.request.get("/admin/products");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { items: AdminProduct[] };
  return body.items;
}

test.describe("product management", () => {
  // Serial: every test creates real products against the shared admin fixture's
  // store, and later tests read that state back through the list/API.
  test.describe.configure({ mode: "serial" });

  test("an administrator creates a product with an image and sees it listed with default states", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) || !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const productName = `Produto E2E ${Date.now()}`;

    await openCreateForm(page);
    await fillProductForm(page, {
      name: productName,
      quantity: "3",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();

    const item = page.getByRole("listitem").filter({ hasText: productName });
    await expect(item).toBeVisible();
    await expect(item.getByText("Ativo", { exact: true })).toBeVisible();
    await expect(
      item.getByRole("switch", { name: /Visível no catálogo: Desligado/ }),
    ).toBeVisible();
    await expect(
      item.getByRole("switch", { name: /Disponível para pedido: Desligado/ }),
    ).toBeVisible();
  });

  test("registering with a SKU already used in the store is rejected without creating the product", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) || !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const sku = `e2e-dup-${uniqueSuffix()}`;

    await openCreateForm(page);
    await fillProductForm(page, {
      name: `Produto original ${Date.now()}`,
      sku,
      quantity: "1",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();
    await expect(page.getByRole("button", { name: "Novo produto" })).toBeVisible();

    const duplicateName = `Produto duplicado ${Date.now()}`;
    await openCreateForm(page);
    await fillProductForm(page, {
      name: duplicateName,
      sku,
      quantity: "1",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();

    await expect(page.getByText(/já está em uso por outro produto/i)).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: duplicateName })).toHaveCount(0);

    const products = await listProductsViaApi(page);
    expect(products.filter((product) => product.sku === sku)).toHaveLength(1);
  });

  test("an administrator from another store cannot read a product by its id", async ({
    page,
    browser,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredSecondAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const productName = `Produto isolamento ${Date.now()}`;

    await openCreateForm(page);
    await fillProductForm(page, {
      name: productName,
      quantity: "1",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: productName })).toBeVisible();

    const products = await listProductsViaApi(page);
    const created = products.find((product) => product.name === productName);
    expect(created).toBeDefined();

    const secondContext = await browser.newContext();
    try {
      const secondPage = await secondContext.newPage();
      await signIn(
        secondPage,
        adminStoreAccess.secondAdminEmail!,
        adminStoreAccess.secondAdminPassword!,
      );

      const foreignResponse = await secondPage.request.get(`/admin/products/${created!.id}`);
      expect(foreignResponse.status()).toBe(404);
      const foreignBody = await foreignResponse.text();
      expect(foreignBody).not.toContain(productName);
    } finally {
      await secondContext.close();
    }
  });

  test("an administrator edits fields and toggles visibility/availability independently", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) || !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const productName = `Produto editável ${Date.now()}`;

    await openCreateForm(page);
    await fillProductForm(page, {
      name: productName,
      quantity: "2",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();

    const item = page.getByRole("listitem").filter({ hasText: productName });
    await expect(item).toBeVisible();
    const productsAfterCreate = await listProductsViaApi(page);
    const originalImageAssetId = productsAfterCreate.find((p) => p.name === productName)?.id;
    expect(originalImageAssetId).toBeDefined();

    // Edit fields without touching the image: FR-013 says the previous image
    // must stay the effective one, never leaving the product without a valid
    // reference. The edit form replaces the row's content (the name becomes
    // an input value, so `item`'s text-based filter no longer resolves it)
    // and is a page-level singleton, so form interactions are unscoped here.
    await item.getByRole("button", { name: "Editar" }).click();
    await expect(page.getByText(/imagem atual será mantida/i)).toBeVisible();
    await page.getByLabel("Descrição").fill("Descrição atualizada via E2E.");
    await page.getByLabel("Quantidade disponível").fill("7");
    await page.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(item.getByText("Quantidade disponível: 7")).toBeVisible();

    // Independent toggles: turning on visibility must not affect availability.
    await item.getByRole("switch", { name: /Visível no catálogo/ }).click();
    await expect(item.getByRole("switch", { name: /Visível no catálogo: Ligado/ })).toBeVisible();
    await expect(
      item.getByRole("switch", { name: /Disponível para pedido: Desligado/ }),
    ).toBeVisible();

    await item.getByRole("switch", { name: /Disponível para pedido/ }).click();
    await expect(
      item.getByRole("switch", { name: /Disponível para pedido: Ligado/ }),
    ).toBeVisible();
    await expect(item.getByRole("switch", { name: /Visível no catálogo: Ligado/ })).toBeVisible();
  });

  test("editing with a SKU already used by another product in the same store is rejected without changing it", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) || !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const takenSku = `e2e-taken-${uniqueSuffix()}`;
    const ownSku = `e2e-own-${uniqueSuffix()}`;

    await openCreateForm(page);
    await fillProductForm(page, {
      name: `Produto com SKU alvo ${Date.now()}`,
      sku: takenSku,
      quantity: "1",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();

    const editableName = `Produto a editar ${Date.now()}`;
    await openCreateForm(page);
    await fillProductForm(page, {
      name: editableName,
      sku: ownSku,
      quantity: "1",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();

    const item = page.getByRole("listitem").filter({ hasText: editableName });
    await item.getByRole("button", { name: "Editar" }).click();
    // The edit form replaces the row's content, so `item`'s text-based filter
    // no longer resolves it while open; it's a page-level singleton, so form
    // interactions are unscoped here.
    await page.getByLabel("SKU (opcional)").fill(takenSku);
    await page.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(page.getByText(/já está em uso por outro produto/i)).toBeVisible();

    const products = await listProductsViaApi(page);
    expect(products.find((product) => product.name === editableName)?.sku).toBe(ownSku);
  });

  test("an administrator from another store cannot edit a product by its id", async ({
    page,
    browser,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredSecondAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const productName = `Produto edição isolada ${Date.now()}`;

    await openCreateForm(page);
    await fillProductForm(page, {
      name: productName,
      quantity: "1",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: productName })).toBeVisible();

    const products = await listProductsViaApi(page);
    const created = products.find((product) => product.name === productName);
    expect(created).toBeDefined();

    const secondContext = await browser.newContext();
    try {
      const secondPage = await secondContext.newPage();
      await signIn(
        secondPage,
        adminStoreAccess.secondAdminEmail!,
        adminStoreAccess.secondAdminPassword!,
      );

      const foreignResponse = await secondPage.request.patch(`/admin/products/${created!.id}`, {
        data: {
          name: "Hijacked",
          sku: null,
          description: "x",
          imageAssetId: created!.id,
          quantityAvailable: 1,
          isVisible: false,
          isOrderable: false,
        },
      });
      expect(foreignResponse.status()).toBe(404);
    } finally {
      await secondContext.close();
    }
  });

  test("deactivating a product preserves its record and makes it ineligible for the public catalog", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) || !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const productName = `Produto a desativar ${Date.now()}`;

    await openCreateForm(page);
    await fillProductForm(page, {
      name: productName,
      quantity: "5",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();

    const item = page.getByRole("listitem").filter({ hasText: productName });
    // Each toggle's PATCH must resolve (confirmed by its own "Ligado" state)
    // before the next click, or the second click's save can still be built
    // from a pre-toggle snapshot and silently undo the first.
    await item.getByRole("switch", { name: /Visível no catálogo/ }).click();
    await expect(item.getByRole("switch", { name: /Visível no catálogo: Ligado/ })).toBeVisible();
    await item.getByRole("switch", { name: /Disponível para pedido/ }).click();
    await expect(
      item.getByRole("switch", { name: /Disponível para pedido: Ligado/ }),
    ).toBeVisible();

    const beforeDeactivate = (await listProductsViaApi(page)).find((p) => p.name === productName)!;
    // docs/data-model.md §2.4: public eligibility requires is_active AND is_visible;
    // cart eligibility additionally requires is_orderable and quantity > 0. No public
    // catalog UI exists in this feature, so the rule is checked against the data
    // returned by the admin API directly.
    expect(isPubliclyEligible(beforeDeactivate)).toBe(true);
    expect(isCartEligible(beforeDeactivate)).toBe(true);

    await item.getByRole("button", { name: "Desativar" }).click();
    await expect(item.getByText("Desativado", { exact: true })).toBeVisible();
    await expect(item).toBeVisible();

    const afterDeactivate = (await listProductsViaApi(page)).find((p) => p.name === productName)!;
    expect(afterDeactivate.isActive).toBe(false);
    // Deactivating preserves the record: visibility/availability are untouched
    // (only reactivate resets them), name/description/etc. remain intact.
    expect(afterDeactivate.isVisible).toBe(true);
    expect(afterDeactivate.isOrderable).toBe(true);
    expect(isPubliclyEligible(afterDeactivate)).toBe(false);
    expect(isCartEligible(afterDeactivate)).toBe(false);
  });

  test("an administrator from another store cannot deactivate a product by its id", async ({
    page,
    browser,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredSecondAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const productName = `Produto desativação isolada ${Date.now()}`;

    await openCreateForm(page);
    await fillProductForm(page, {
      name: productName,
      quantity: "1",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: productName })).toBeVisible();

    const products = await listProductsViaApi(page);
    const created = products.find((product) => product.name === productName);
    expect(created).toBeDefined();

    const secondContext = await browser.newContext();
    try {
      const secondPage = await secondContext.newPage();
      await signIn(
        secondPage,
        adminStoreAccess.secondAdminEmail!,
        adminStoreAccess.secondAdminPassword!,
      );

      const foreignResponse = await secondPage.request.post(
        `/admin/products/${created!.id}/deactivate`,
      );
      expect(foreignResponse.status()).toBe(404);
    } finally {
      await secondContext.close();
    }
  });

  test("reactivating a product always resets visibility and availability, regardless of prior state", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) || !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const productName = `Produto a reativar ${Date.now()}`;

    await openCreateForm(page);
    await fillProductForm(page, {
      name: productName,
      quantity: "1",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();

    const item = page.getByRole("listitem").filter({ hasText: productName });
    // Each toggle's PATCH must resolve before the next click (see the same
    // note in the "deactivating a product" test above).
    await item.getByRole("switch", { name: /Visível no catálogo/ }).click();
    await expect(item.getByRole("switch", { name: /Visível no catálogo: Ligado/ })).toBeVisible();
    await item.getByRole("switch", { name: /Disponível para pedido/ }).click();
    await expect(
      item.getByRole("switch", { name: /Disponível para pedido: Ligado/ }),
    ).toBeVisible();
    await item.getByRole("button", { name: "Desativar" }).click();
    await expect(item.getByText("Desativado", { exact: true })).toBeVisible();

    await expect(item.getByText(/Reativar desliga visibilidade e disponibilidade/i)).toBeVisible();
    await item.getByRole("button", { name: "Reativar" }).click();

    await expect(item.getByText("Ativo", { exact: true })).toBeVisible();
    await expect(
      item.getByRole("switch", { name: /Visível no catálogo: Desligado/ }),
    ).toBeVisible();
    await expect(
      item.getByRole("switch", { name: /Disponível para pedido: Desligado/ }),
    ).toBeVisible();

    const afterReactivate = (await listProductsViaApi(page)).find((p) => p.name === productName)!;
    expect(afterReactivate.isActive).toBe(true);
    expect(afterReactivate.isVisible).toBe(false);
    expect(afterReactivate.isOrderable).toBe(false);
  });

  test("an administrator from another store cannot reactivate a product by its id", async ({
    page,
    browser,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredSecondAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const productName = `Produto reativação isolada ${Date.now()}`;

    await openCreateForm(page);
    await fillProductForm(page, {
      name: productName,
      quantity: "1",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: productName })).toBeVisible();

    const products = await listProductsViaApi(page);
    const created = products.find((product) => product.name === productName);
    expect(created).toBeDefined();

    const secondContext = await browser.newContext();
    try {
      const secondPage = await secondContext.newPage();
      await signIn(
        secondPage,
        adminStoreAccess.secondAdminEmail!,
        adminStoreAccess.secondAdminPassword!,
      );

      const foreignResponse = await secondPage.request.post(
        `/admin/products/${created!.id}/reactivate`,
      );
      expect(foreignResponse.status()).toBe(404);
    } finally {
      await secondContext.close();
    }
  });

  test("cancelling the delete dialog preserves the product; confirming removes it permanently", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) || !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const productName = `Produto a excluir ${Date.now()}`;

    await openCreateForm(page);
    await fillProductForm(page, {
      name: productName,
      quantity: "1",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();

    const item = page.getByRole("listitem").filter({ hasText: productName });
    await item.getByRole("button", { name: "Excluir" }).click();

    const warningText = `Tem certeza de que deseja excluir definitivamente o produto "${productName}"? Essa ação não pode ser desfeita. Para apenas ocultá-lo e preservá-lo, use "Desativar".`;
    await expect(page.getByText(warningText)).toBeVisible();

    const cancelButton = page.getByRole("button", { name: "Cancelar" });
    await expect(cancelButton).toBeFocused();

    // Escape closes the dialog like Cancelar, without deleting anything.
    await page.keyboard.press("Escape");
    await expect(page.getByText(warningText)).toHaveCount(0);
    await expect(item).toBeVisible();

    await item.getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(item).toBeVisible();

    await item.getByRole("button", { name: "Excluir" }).click();
    await page.getByRole("button", { name: "Excluir definitivamente" }).click();

    await expect(item).toHaveCount(0);
    const products = await listProductsViaApi(page);
    expect(products.find((product) => product.name === productName)).toBeUndefined();
  });

  test("an administrator from another store cannot delete a product by its id", async ({
    page,
    browser,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredSecondAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredValidJpeg(productImages),
      "Non-production admin/image fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const productName = `Produto exclusão isolada ${Date.now()}`;

    await openCreateForm(page);
    await fillProductForm(page, {
      name: productName,
      quantity: "1",
      imagePath: productImages.validJpegPath!,
    });
    await page.getByRole("button", { name: "Salvar produto" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: productName })).toBeVisible();

    const products = await listProductsViaApi(page);
    const created = products.find((product) => product.name === productName);
    expect(created).toBeDefined();

    const secondContext = await browser.newContext();
    try {
      const secondPage = await secondContext.newPage();
      await signIn(
        secondPage,
        adminStoreAccess.secondAdminEmail!,
        adminStoreAccess.secondAdminPassword!,
      );

      const foreignResponse = await secondPage.request.delete(`/admin/products/${created!.id}`);
      expect(foreignResponse.status()).toBe(404);
    } finally {
      await secondContext.close();
    }

    const stillThere = await listProductsViaApi(page);
    expect(stillThere.find((product) => product.id === created!.id)).toBeDefined();
  });

  test("an oversized image is rejected with a clear message and does not create the product", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredOversizedFile(productImages),
      "Non-production admin/oversized-file fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const productName = `Produto arquivo grande ${uniqueSuffix()}`;

    await openCreateForm(page);
    await page.getByLabel("Nome").fill(productName);
    await page.getByLabel("Descrição").fill("Descrição de teste E2E.");
    await page.getByLabel("Quantidade disponível").fill("1");
    await page.getByLabel("Imagem do produto").setInputFiles(productImages.oversizedPath!);

    await expect(page.getByText(/excede o limite de 10 MB/i)).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: productName })).toHaveCount(0);
  });

  test("an unsupported image format is rejected with a clear message and does not create the product", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    const productImages = getProductImageFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredUnsupportedFormat(productImages),
      "Non-production admin/unsupported-format fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const productName = `Produto formato não aceito ${uniqueSuffix()}`;

    await openCreateForm(page);
    await page.getByLabel("Nome").fill(productName);
    await page.getByLabel("Descrição").fill("Descrição de teste E2E.");
    await page.getByLabel("Quantidade disponível").fill("1");
    await page.getByLabel("Imagem do produto").setInputFiles(productImages.unsupportedFormatPath!);

    await expect(page.getByText(/formato de imagem não aceito/i)).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: productName })).toHaveCount(0);
  });
});

function isPubliclyEligible(product: AdminProduct): boolean {
  return product.isActive && product.isVisible;
}

function isCartEligible(product: AdminProduct): boolean {
  return (
    product.isActive && product.isVisible && product.isOrderable && product.quantityAvailable > 0
  );
}
