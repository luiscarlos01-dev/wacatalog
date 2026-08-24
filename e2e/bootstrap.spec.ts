import { expect, test } from "@playwright/test";

test("loads the application shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Wacatalog");
  await expect(page.getByRole("heading", { name: "Wacatalog" })).toBeVisible();
});
