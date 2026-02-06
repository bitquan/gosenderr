import { test, expect } from "@playwright/test";

// Ensure a clean auth state before each test to avoid leaked sessions
test.beforeEach(async ({ page }) => {
  // Ensure we're on the app origin before accessing localStorage
  await page.goto('/');
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
});

test("redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Marketplace Portal" })).toBeVisible();
});

test("marketplace route is publicly accessible", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(page).toHaveURL(/\/marketplace/);
  await expect(page.getByRole("heading", { name: "GoSenderr Marketplace" })).toBeVisible();
});
