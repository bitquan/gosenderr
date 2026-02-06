import { test, expect } from "@playwright/test";

// Ensure a clean auth state before each test to avoid leaked sessions
test.beforeEach(async ({ page }) => {
  // Ensure we're on the app origin before accessing localStorage
  await page.goto('/');
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
});

test("dashboard route is reachable", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("marketplace route is publicly accessible", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(page).toHaveURL(/\/marketplace/);
});
