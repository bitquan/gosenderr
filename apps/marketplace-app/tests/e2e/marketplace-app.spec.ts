import { test, expect } from "@playwright/test";
import './global-hooks';
import { captureStep } from './test-helpers';

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
  await expect(page.getByRole("heading", { name: "Customer Portal" })).toBeVisible();
});

test("marketplace route is publicly accessible", async ({ page }, testInfo) => {
  await page.goto("/marketplace");
  // Step-level screenshot to capture the loaded screen
  await captureStep(page, testInfo, 'marketplace-loaded');
  await expect(page).toHaveURL(/\/marketplace/);
  await expect(page.getByRole("heading", { name: /Welcome to GoSenderR Marketplace/ })).toBeVisible();
});