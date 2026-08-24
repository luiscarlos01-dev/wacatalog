import { defineConfig, devices } from "@playwright/test";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3000",
    // `on-first-retry` never fires locally (retries: 0), so a local failure left
    // no trace to inspect. Always retain on failure instead.
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    launchOptions: {
      // Traced root cause of an intermittent mobile-chromium login failure: Chromium's
      // own password manager silently overwrote a filled field with a locally saved
      // credential before submit. This disables that subsystem for the test browser
      // only — the product's `autoComplete` attributes (real users' password
      // managers) are untouched.
      args: [
        "--disable-features=PasswordManagerOnboarding,AutofillServerCommunication,AutofillEnableAccountWalletStorage",
        "--disable-save-password-bubble",
      ],
    },
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "pnpm exec next build --webpack && pnpm exec next start --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    // Always fail fast if the port is already occupied instead of silently
    // reusing whatever is listening there (e.g. a `pnpm dev` left open) — the
    // whole point of building here is a guarantee this suite runs against a
    // production build, not dev mode.
    reuseExistingServer: false,
    timeout: 120000,
  },
});
