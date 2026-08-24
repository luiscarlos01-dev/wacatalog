import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { authCopy } from "@/features/auth/auth-copy";
import { getPublicEnv } from "@/lib/config/env";

import {
  getAdminStoreAccessFixture,
  hasConfiguredAdminStoreAccess,
  hasConfiguredSecondAdminStoreAccess,
  hasConfiguredUnaffiliatedAdminAccess,
} from "./fixtures/admin-store-access";

// Non-production mail capture for Supabase local dev (Mailpit), started by `supabase start`.
const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitMessageSummary = {
  ID: string;
  To: Array<{ Address: string }>;
  Created: string;
};

async function isMailpitReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${MAILPIT_URL}/api/v1/info`, {
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function fetchRecoveryLink(email: string, sentAfter: number): Promise<string> {
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    const listResponse = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=25`);
    if (listResponse.ok) {
      const list = (await listResponse.json()) as { messages: MailpitMessageSummary[] };
      const candidate = list.messages
        .filter(
          (message) =>
            message.To.some((recipient) => recipient.Address === email) &&
            new Date(message.Created).getTime() >= sentAfter,
        )
        .sort((a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime())[0];

      if (candidate) {
        const messageResponse = await fetch(`${MAILPIT_URL}/api/v1/message/${candidate.ID}`);
        const message = (await messageResponse.json()) as { Text: string };
        const match = message.Text.match(/(https?:\/\/\S*type=recovery\S*)/);
        if (match) {
          return match[1].replace(/[)\s]+$/, "");
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`No recovery email received for ${email} within timeout.`);
}

test.describe("admin store access", () => {
  // Serial: the recovery-journey test below rotates the shared admin fixture's
  // password (reverted in `finally`), which would otherwise race concurrent
  // logins from other tests in this file under `fullyParallel`.
  test.describe.configure({ mode: "serial" });

  async function fillLoginForm(page: Page, email: string, password: string) {
    await page.goto("/admin/login");
    const emailField = page.getByLabel("Email");
    const passwordField = page.getByLabel("Senha");
    await emailField.fill(email);
    await passwordField.fill(password);
    // Guard against the browser/OS credential autofill overwriting a field after
    // `.fill()` (observed intermittently on mobile-chromium) — re-assert the
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
  }

  async function signIn(page: Page, email: string, password: string) {
    await fillLoginForm(page, email, password);
    // The click resolves once dispatched, not once the async sign-in + cookie
    // persistence + client-side redirect completes; a bare `.request.get()`
    // right after can race an unset session cookie. Waiting for the redirect
    // makes the resulting session state deterministic for callers. A short,
    // explicit timeout fails fast with a trace instead of burning the full
    // test timeout with no signal when this hangs.
    await page.waitForURL(/\/admin$/, { timeout: 8000 });
  }

  async function submitRecovery(page: Page, email: string) {
    await page.goto("/admin/forgot-password");
    const emailField = page.getByLabel("Email");
    await emailField.fill(email);
    if ((await emailField.inputValue()) !== email) {
      await emailField.fill(email);
    }
    await expect(emailField).toHaveValue(email);
    await page.getByRole("button", { name: "Enviar instruções" }).click();

    await expect(page.getByText(authCopy.recoveryConfirmation)).toBeVisible();
    await expect(page.getByText(authCopy.recoverySupport)).toBeVisible();
  }

  test("does not offer public signup and exposes recovery in PT-BR", async ({ page }) => {
    await page.goto("/admin/login");

    await expect(page.getByRole("heading", { name: "Entrar no painel" })).toBeVisible();
    await expect(page.getByRole("link", { name: /esqueci minha senha/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /criar conta|cadastro/i })).toHaveCount(0);

    await page.getByRole("link", { name: /esqueci minha senha/i }).click();
    await expect(page.getByRole("heading", { name: "Recuperar acesso" })).toBeVisible();
    await expect(page.getByText(/não precisa enviar sua senha/i)).toBeVisible();
  });

  test("submit controls are server-rendered disabled until React hydrates", async ({ page }) => {
    // A disabled submit button in the raw, pre-JS server HTML blocks native
    // click/Enter submission by construction — this checks the actual network
    // response, not browser timing, so it is not racy either way.
    for (const path of ["/admin/login", "/admin/forgot-password", "/admin/reset-password"]) {
      const response = await page.request.get(path);
      expect(response.status()).toBe(200);
      const html = await response.text();
      const submitButtonMatch = html.match(/<button[^>]*type="submit"[^>]*>/);
      expect(submitButtonMatch, `no submit button found in ${path}`).not.toBeNull();
      expect(submitButtonMatch![0]).toContain("disabled");
    }

    // Once a real browser finishes loading and hydrating, the control must
    // become usable again — the guard is a startup gate, not a permanent lock.
    await page.goto("/admin/login");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  test("public shell does not require administrator login", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Wacatalog" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveCount(0);
  });

  test("an invalid recovery link is safe and does not ask for an old password", async ({
    page,
  }) => {
    await page.goto("/admin/reset-password");

    await expect(page.getByText(/link de recuperação é inválido/i)).toBeVisible();
    await expect(page.getByLabel(/senha atual|senha anterior/i)).toHaveCount(0);
  });

  test("recovery stays neutral for provisioned and unknown emails", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredUnaffiliatedAdminAccess(adminStoreAccess),
      "Non-production auth fixture is not configured.",
    );

    // Hits the real Supabase Auth recovery endpoint for both cases (no mock): GoTrue's
    // own anti-enumeration behavior is what this test verifies, not a stubbed response.
    // Uses the unaffiliated fixture (not the primary admin) so this doesn't compete with
    // the real-recovery-journey test's `email_sent` budget for the same address.
    await submitRecovery(page, adminStoreAccess.unaffiliatedAdminEmail!);
    await submitRecovery(page, "unknown-admin-neutrality@wacatalog.test");
  });

  test("a real recovery email lets the administrator set a new password and sign in", async ({
    page,
  }, testInfo) => {
    // Runs once: this test mutates the shared admin fixture's password (reverted in
    // `finally`), so it must not race a second instance of itself across projects.
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "Runs once against the shared admin fixture to avoid racing its own password revert.",
    );

    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production auth fixture is not configured.",
    );

    test.skip(
      !(await isMailpitReachable()),
      `Local mail capture is not reachable at ${MAILPIT_URL}.`,
    );

    const originalPassword = adminStoreAccess.adminPassword!;
    const newPassword = `Recovery-${Date.now()}-Aa1!`;
    const requestedAt = Date.now();

    await page.goto("/admin/forgot-password");
    await page.getByLabel("Email").fill(adminStoreAccess.adminEmail!);
    await page.getByRole("button", { name: "Enviar instruções" }).click();
    await expect(page.getByText(authCopy.recoveryConfirmation)).toBeVisible();

    const recoveryLink = await fetchRecoveryLink(adminStoreAccess.adminEmail!, requestedAt);

    await page.goto(recoveryLink);
    await expect(page.getByRole("heading", { name: "Definir nova senha" })).toBeVisible();

    const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

    try {
      await page.getByLabel("Nova senha", { exact: true }).fill(newPassword);
      await page.getByLabel("Confirmar nova senha").fill(newPassword);
      await page.getByRole("button", { name: "Salvar nova senha" }).click();
      await expect(page.getByText(/senha atualizada/i)).toBeVisible();

      const verifyClient = createClient(supabaseUrl, supabasePublishableKey);
      try {
        const { error: signInError } = await verifyClient.auth.signInWithPassword({
          email: adminStoreAccess.adminEmail!,
          password: newPassword,
        });
        expect(signInError).toBeNull();
      } finally {
        await verifyClient.auth.signOut();
      }
    } finally {
      const revertClient = createClient(supabaseUrl, supabasePublishableKey);
      const { error: alreadyOriginalError } = await revertClient.auth.signInWithPassword({
        email: adminStoreAccess.adminEmail!,
        password: originalPassword,
      });

      if (alreadyOriginalError) {
        const { error: newPasswordError } = await revertClient.auth.signInWithPassword({
          email: adminStoreAccess.adminEmail!,
          password: newPassword,
        });
        if (!newPasswordError) {
          await revertClient.auth.updateUser({ password: originalPassword });
        }
      }

      await revertClient.auth.signOut();
    }
  });

  test("provisioned administrator reaches only the protected panel", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production auth fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText("Painel da loja", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();

    await page.goto("/admin/login");
    await expect(page).toHaveURL(/\/admin$/);

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("invalid credentials remain neutral", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production auth fixture is not configured.",
    );

    await fillLoginForm(page, adminStoreAccess.adminEmail!, "invalid-password-for-test");

    const loginError = page.getByRole("alert").filter({ hasText: /não foi possível entrar/i });
    await expect(loginError).toContainText(/não foi possível entrar/i);
    await expect(loginError).not.toContainText(/existe|cadastrado|provisionado/i);
  });

  test("each administrator can read only the own store", async ({ browser }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredSecondAdminStoreAccess(adminStoreAccess),
      "Non-production auth fixture is not configured.",
    );

    const firstContext = await browser.newContext();
    const secondContext = await browser.newContext();

    try {
      const firstPage = await firstContext.newPage();
      const secondPage = await secondContext.newPage();

      await signIn(firstPage, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
      await signIn(
        secondPage,
        adminStoreAccess.secondAdminEmail!,
        adminStoreAccess.secondAdminPassword!,
      );

      const firstResponse = await firstPage.request.get("/admin/store");
      const secondResponse = await secondPage.request.get("/admin/store");

      expect(firstResponse.status()).toBe(200);
      expect(secondResponse.status()).toBe(200);

      const firstStore = (await firstResponse.json()) as { id: string; name: string; slug: string };
      const secondStore = (await secondResponse.json()) as {
        id: string;
        name: string;
        slug: string;
      };

      expect(firstStore.id).not.toBe(secondStore.id);

      const foreignResponse = await firstPage.request.get(`/admin/store?storeId=${secondStore.id}`);
      expect(foreignResponse.status()).toBe(200);
      expect((await foreignResponse.json()) as { id: string }).toEqual(firstStore);
    } finally {
      await firstContext.close();
      await secondContext.close();
    }
  });

  test("administrator A cannot create a membership for store B through the Data API", async ({
    browser,
  }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess) ||
        !hasConfiguredSecondAdminStoreAccess(adminStoreAccess),
      "Non-production auth fixture is not configured.",
    );

    const secondContext = await browser.newContext();
    let storeB: { id: string; name: string; slug: string };

    try {
      const secondPage = await secondContext.newPage();
      await signIn(
        secondPage,
        adminStoreAccess.secondAdminEmail!,
        adminStoreAccess.secondAdminPassword!,
      );
      const storeBResponse = await secondPage.request.get("/admin/store");
      expect(storeBResponse.status()).toBe(200);
      storeB = (await storeBResponse.json()) as { id: string; name: string; slug: string };
    } finally {
      await secondContext.close();
    }

    const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
    const dataApiClient = createClient(supabaseUrl, supabasePublishableKey);

    try {
      const { data: session, error: signInError } = await dataApiClient.auth.signInWithPassword({
        email: adminStoreAccess.adminEmail!,
        password: adminStoreAccess.adminPassword!,
      });
      expect(signInError).toBeNull();
      const adminAUserId = session.user?.id;
      expect(adminAUserId).toBeTruthy();

      const { data: insertData, error: insertError } = await dataApiClient
        .from("store_memberships")
        .insert({ auth_user_id: adminAUserId, role: "store_admin", store_id: storeB.id })
        .select();

      expect(insertError).not.toBeNull();
      expect(insertData).toBeNull();

      const insertErrorText = JSON.stringify(insertError);
      expect(insertErrorText).not.toContain(storeB.name);
      expect(insertErrorText).not.toContain(storeB.slug);

      const { data: ownMemberships, error: readError } = await dataApiClient
        .from("store_memberships")
        .select("store_id")
        .eq("store_id", storeB.id);

      expect(readError).toBeNull();
      expect(ownMemberships).toEqual([]);
    } finally {
      await dataApiClient.auth.signOut();
    }
  });

  test("an unaffiliated administrator receives a safe denial", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredUnaffiliatedAdminAccess(adminStoreAccess),
      "Non-production auth fixture is not configured.",
    );

    await signIn(
      page,
      adminStoreAccess.unaffiliatedAdminEmail!,
      adminStoreAccess.unaffiliatedAdminPassword!,
    );

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Acesso não autorizado" })).toBeVisible();
    await expect(page.getByText(/não está associada a uma loja administrável/i)).toBeVisible();
  });

  test("a valid session survives a return and ignores a foreign store query", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production auth fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await expect(page).toHaveURL(/\/admin$/);

    await page.reload();
    await expect(page.getByText("Painel da loja", { exact: true })).toBeVisible();

    const response = await page.request.get("/admin/store?storeId=foreign-store");
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain("foreign-store");
  });

  test("an expired session redirects before protected data is rendered", async ({ page }) => {
    const adminStoreAccess = getAdminStoreAccessFixture();
    test.skip(
      !hasConfiguredAdminStoreAccess(adminStoreAccess),
      "Non-production auth fixture is not configured.",
    );

    await signIn(page, adminStoreAccess.adminEmail!, adminStoreAccess.adminPassword!);
    await expect(page).toHaveURL(/\/admin$/);

    const authCookies = (await page.context().cookies()).filter(
      ({ name }) => name.startsWith("sb-") && name.includes("-auth-token"),
    );
    expect(authCookies.length).toBeGreaterThan(0);

    await page.context().addCookies(
      authCookies.map(({ domain, httpOnly, name, path, sameSite, secure }) => ({
        domain,
        httpOnly,
        name,
        path,
        sameSite,
        secure,
        value: "expired-session",
      })),
    );

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("heading", { name: "Painel da loja" })).toHaveCount(0);
  });

  test("direct protected access is denied without a session", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
