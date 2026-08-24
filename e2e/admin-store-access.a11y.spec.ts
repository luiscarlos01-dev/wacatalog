import { expect, test, type Locator, type Page } from "@playwright/test";

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

async function waitForTransitionsToSettle(locator: Locator): Promise<void> {
  await locator.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
}

async function mockNeutralAuthResponses(page: Page) {
  await page.route("**/auth/v1/**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ body: "{}", contentType: "application/json", status: 200 });
      return;
    }
    await route.continue();
  });
}

test.describe("admin access accessibility", () => {
  test("login controls are keyboard reachable with visible focus", async ({ page }) => {
    await page.goto("/admin/login");

    await page.keyboard.press("Tab");
    const focusedControl = page.locator("#email");

    await expect(focusedControl).toBeFocused();
    await expect(focusedControl).not.toHaveCSS("box-shadow", "none");
  });

  test("login and recovery render on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: "Entrar no painel" })).toBeVisible();
    await page.goto("/admin/forgot-password");
    await expect(page.getByRole("heading", { name: "Recuperar acesso" })).toBeVisible();
  });

  test("login screen text meets WCAG 2.2 AA contrast", async ({ page }) => {
    await page.goto("/admin/login");

    // Large text (>=24px): 3:1 minimum.
    await expect(
      await getContrastRatio(page.getByRole("heading", { name: "Entrar no painel" })),
    ).toBeGreaterThanOrEqual(3);

    // Normal text: 4.5:1 minimum.
    await expect(await getContrastRatio(page.getByText("Wacatalog"))).toBeGreaterThanOrEqual(4.5);
    await expect(
      await getContrastRatio(page.getByText(/use o email e a senha/i)),
    ).toBeGreaterThanOrEqual(4.5);
    await expect(await getContrastRatio(page.locator('label[for="email"]'))).toBeGreaterThanOrEqual(
      4.5,
    );
    await expect(
      await getContrastRatio(page.getByRole("button", { name: "Entrar" })),
    ).toBeGreaterThanOrEqual(4.5);

    await page.getByRole("button", { name: "Entrar" }).click();
    const emailError = page.locator("#email-error");
    await expect(emailError).toBeVisible();
    await expect(await getContrastRatio(emailError)).toBeGreaterThanOrEqual(4.5);
  });

  test("recovery screen text meets WCAG 2.2 AA contrast", async ({ page }) => {
    await mockNeutralAuthResponses(page);
    await page.goto("/admin/forgot-password");

    await expect(
      await getContrastRatio(page.getByRole("heading", { name: "Recuperar acesso" })),
    ).toBeGreaterThanOrEqual(3);
    await expect(
      await getContrastRatio(page.getByText(/informe seu email para receber/i)),
    ).toBeGreaterThanOrEqual(4.5);

    await page.getByLabel("Email").fill("test-a11y@example.com");
    await page.getByRole("button", { name: "Enviar instruções" }).click();

    const confirmation = page.getByText(/você receberá instruções/i);
    await expect(confirmation).toBeVisible();
    await expect(await getContrastRatio(confirmation)).toBeGreaterThanOrEqual(4.5);
  });

  test("invalid recovery link screen meets WCAG 2.2 AA contrast", async ({ page }) => {
    await page.goto("/admin/reset-password");

    const invalidLinkMessage = page.getByText(/link de recuperação é inválido/i);
    await expect(invalidLinkMessage).toBeVisible();
    await expect(await getContrastRatio(invalidLinkMessage)).toBeGreaterThanOrEqual(4.5);
  });

  test("focused controls keep a 3:1 border contrast against the surrounding surface", async ({
    page,
  }) => {
    await page.goto("/admin/login");

    const emailField = page.locator("#email");
    await emailField.focus();
    await waitForTransitionsToSettle(emailField);
    await expect(await getContrastRatio(emailField, "border")).toBeGreaterThanOrEqual(3);

    const passwordField = page.locator("#password");
    await passwordField.focus();
    await waitForTransitionsToSettle(passwordField);
    await expect(await getContrastRatio(passwordField, "border")).toBeGreaterThanOrEqual(3);
  });

  test("focused buttons and links keep a 3:1 ring contrast against the surrounding surface", async ({
    page,
  }) => {
    await page.goto("/admin/login");

    const submitButton = page.getByRole("button", { name: "Entrar" });
    await submitButton.focus();
    await waitForTransitionsToSettle(submitButton);
    await expect(await getContrastRatio(submitButton, "ring")).toBeGreaterThanOrEqual(3);

    const recoveryLink = page.getByRole("link", { name: "Esqueci minha senha" });
    await recoveryLink.focus();
    await waitForTransitionsToSettle(recoveryLink);
    await expect(await getContrastRatio(recoveryLink, "ring")).toBeGreaterThanOrEqual(3);

    await mockNeutralAuthResponses(page);
    await page.goto("/admin/forgot-password");

    const recoverySubmitButton = page.getByRole("button", { name: "Enviar instruções" });
    await recoverySubmitButton.focus();
    await waitForTransitionsToSettle(recoverySubmitButton);
    await expect(await getContrastRatio(recoverySubmitButton, "ring")).toBeGreaterThanOrEqual(3);
  });

  test("transitions collapse to near-zero when reduced motion is preferred", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/admin/login");

    const emailField = page.locator("#email");
    await emailField.focus();

    const durations = await emailField.evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    );

    for (const duration of parseDurationsToSeconds(durations)) {
      expect(duration).toBeLessThanOrEqual(0.05);
    }
  });
});
