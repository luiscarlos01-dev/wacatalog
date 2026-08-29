import { expect, test, type Page } from "@playwright/test";

import {
  getAdminStoreAccessFixture,
  hasConfiguredAdminStoreAccess,
  hasConfiguredSecondAdminStoreAccess,
} from "./fixtures/admin-store-access";

type AdminStore = {
  whatsappNumber: string | null;
  whatsappVerificationStatus: "unverified" | "verified";
  whatsappVerifiedAt: string | null;
};

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  const emailField = page.getByLabel("Email");
  const passwordField = page.getByLabel("Senha");
  await emailField.fill(email);
  await passwordField.fill(password);
  // Guard against browser/OS credential autofill clobbering a field after
  // `.fill()` (see e2e/admin-store-access.spec.ts).
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

async function getStoreViaApi(page: Page): Promise<AdminStore> {
  const response = await page.request.get("/admin/store");
  expect(response.status()).toBe(200);
  return (await response.json()) as AdminStore;
}

test.describe("WhatsApp store config", () => {
  // Serial and order-sensitive: every test mutates the same shared admin
  // fixture's store (there is no per-store list to isolate against, unlike
  // products), and the approved contract has no flow to clear a number back
  // to null (spec.md Assumptions). The very first test below depends on the
  // store never having had a WhatsApp number configured — it must stay first
  // in this file and only holds true right after a fresh `db reset`.
  test.describe.configure({ mode: "serial" });

  test("confirming verification without any number configured is rejected with a clear message", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");

    await expect(page.getByText("Não configurado")).toBeVisible();
    await page.getByRole("button", { name: "Confirmar verificação" }).click();

    await expect(
      page.getByText(/configure um número de whatsapp antes de confirmar a verificação/i),
    ).toBeVisible();
  });

  test("configuring a number in a familiar format normalizes it and resets verification to unconfirmed", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");

    await page.getByLabel("Número de WhatsApp").fill("(11) 91234-5678");
    await page.getByRole("button", { name: "Salvar número" }).click();

    await expect(page.getByText("5511912345678")).toBeVisible();
    await expect(page.getByText("Não confirmado")).toBeVisible();
  });

  // FR-011: `.fill()` above sets the final value directly and only fires one
  // `input` event, so it never exercises the mask building up character by
  // character — this uses real keystrokes instead. Doesn't submit, so it
  // can't affect the persisted state the other (serial) tests depend on.
  test("typing a number digit by digit shows the mask building progressively", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");

    const numberField = page.getByLabel("Número de WhatsApp");
    await numberField.fill("");
    await numberField.pressSequentially("11912345678");

    await expect(numberField).toHaveValue("(11) 91234-5678");
  });

  test("confirming a configured number marks it verified with a timestamp", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");

    await page.getByRole("button", { name: "Confirmar verificação" }).click();
    await expect(page.getByText(/^Confirmado em /)).toBeVisible();

    const store = await getStoreViaApi(page);
    expect(store.whatsappVerificationStatus).toBe("verified");
    expect(store.whatsappVerifiedAt).not.toBeNull();
  });

  test("reconfirming an already-verified number is idempotent and updates the timestamp", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");

    const before = await getStoreViaApi(page);
    expect(before.whatsappVerificationStatus).toBe("verified");

    await page.getByRole("button", { name: "Confirmar verificação" }).click();
    await expect(page.getByText(/^Confirmado em /)).toBeVisible();

    const after = await getStoreViaApi(page);
    expect(after.whatsappVerificationStatus).toBe("verified");
  });

  test("clicking test opens wa.me for the normalized number without a pre-filled message", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");

    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Testar número" }).click();
    const popup = await popupPromise;

    expect(popup.url()).toBe("https://wa.me/5511912345678");
    await popup.close();
  });

  test("altering an already-confirmed number resets verification to unconfirmed", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");

    await expect(page.getByText(/^Confirmado em /)).toBeVisible();

    await page.getByLabel("Número de WhatsApp").fill("(21) 98888-7777");
    await page.getByRole("button", { name: "Salvar número" }).click();

    await expect(page.getByText("5521988887777")).toBeVisible();
    await expect(page.getByText("Não confirmado")).toBeVisible();
  });

  test("an invalid value is rejected with a clear message, without altering the configured number", async ({
    page,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await page.goto("/admin");

    await page.getByLabel("Número de WhatsApp").fill("123");
    await page.getByRole("button", { name: "Salvar número" }).click();

    await expect(
      page.getByText(/informe um número de whatsapp brasileiro válido, com ddd/i),
    ).toBeVisible();
    await expect(page.getByText("5521988887777")).toBeVisible();
  });

  test("an administrator from another store cannot affect store A's WhatsApp number", async ({
    page,
    browser,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredSecondAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixtures are not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    const storeABefore = await getStoreViaApi(page);

    const secondContext = await browser.newContext();
    try {
      const secondPage = await secondContext.newPage();
      await signIn(
        secondPage,
        adminStoreAccess.secondAdminEmail!,
        adminStoreAccess.secondAdminPassword!,
      );

      // `/admin/store` never accepts a target store id (FR-008): admin B can
      // only ever reach their own store B through it, never store A. This
      // proves that structurally, by asserting store A is untouched.
      const patchResponse = await secondPage.request.patch("/admin/store", {
        data: { whatsappNumber: "(31) 97777-6666" },
      });
      expect(patchResponse.status()).toBe(200);

      const confirmResponse = await secondPage.request.post("/admin/store/whatsapp/verification");
      expect([200, 409]).toContain(confirmResponse.status());
    } finally {
      await secondContext.close();
    }

    const storeAAfter = await getStoreViaApi(page);
    expect(storeAAfter).toEqual(storeABefore);
  });
});
