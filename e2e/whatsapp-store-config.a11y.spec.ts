import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  getAdminStoreAccessFixture,
  hasConfiguredAdminStoreAccess,
  hasConfiguredSecondAdminStoreAccess,
} from "./fixtures/admin-store-access";

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

test.describe("WhatsApp store config accessibility", () => {
  test("the form is keyboard reachable with visible focus", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredSecondAdminStoreAccess(adminStoreAccess),
      "Non-production second admin fixture is not configured.",
    );

    // Uses the second admin (store B), not the primary fixture (store A): this
    // test conditionally submits a number below, and store A is the one
    // `whatsapp-store-config.spec.ts` depends on staying unconfigured for its
    // own first (order-sensitive, fresh-`db reset`-only) test. Which admin
    // signs in doesn't matter for a11y/keyboard-nav properties.
    await signIn(page, adminStoreAccess.secondAdminEmail!, adminStoreAccess.secondAdminPassword!);

    const numberField = page.locator("#whatsapp-number");
    const testButton = page.getByRole("button", { name: "Testar número" });
    if (await testButton.isDisabled()) {
      // "Testar número" only enables once a number is configured (component
      // behavior, not a bug) — this file's tests are read-only and don't
      // otherwise guarantee that precondition, so establish it here via the
      // real form instead of depending on another spec file having already
      // run first. A same-page form submit, not a navigation, so it doesn't
      // reintroduce the goto-after-signIn focus loss this file hit before.
      await numberField.fill("(11) 91234-5678");
      await page.getByRole("button", { name: "Salvar número" }).click();
      await expect(testButton).toBeEnabled();
    }

    await numberField.focus();
    await expect(numberField).toBeFocused();
    // Focus indicator is a box-shadow ring (`focus:ring-*`), not the native
    // outline, matching the convention already established in login-form.tsx.
    await expect(numberField).not.toHaveCSS("box-shadow", "none");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Salvar número" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(testButton).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Confirmar verificação" })).toBeFocused();
  });

  test("the section renders on a mobile viewport", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);

    await expect(page.getByRole("heading", { name: "WhatsApp da loja" })).toBeVisible();
    await expect(page.getByLabel("Número de WhatsApp")).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar número" })).toBeVisible();
  });

  test("the section's text and buttons meet WCAG 2.2 AA contrast", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production admin fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);

    await expect(
      await getContrastRatio(page.getByRole("heading", { name: "WhatsApp da loja" })),
    ).toBeGreaterThanOrEqual(3);
    await expect(
      await getContrastRatio(page.getByRole("button", { name: "Salvar número" })),
    ).toBeGreaterThanOrEqual(4.5);
    await expect(
      await getContrastRatio(page.getByRole("button", { name: "Confirmar verificação" })),
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

    const saveButton = page.getByRole("button", { name: "Salvar número" });
    await saveButton.focus();

    const durations = await saveButton.evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    );

    for (const duration of parseDurationsToSeconds(durations)) {
      expect(duration).toBeLessThanOrEqual(0.05);
    }
  });
});
