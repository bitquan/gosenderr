import { test, expect } from "@playwright/test";

test("redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Customer Portal" })).toBeVisible();
});

test("marketplace route is protected", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(page).toHaveURL(/\/login/);
});