import { test, expect } from '@playwright/test';

const VENDOR_EMAIL = 'vender@sender.com';
const VENDOR_PASS = 'admin123';

// Ensure a clean auth state before each test to avoid leaked sessions
test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
});

test.describe('Vendor auth + pages', () => {
  test('can sign in as vendor and access vendor pages', async ({ page }) => {
    await page.goto('/login');

    // Pick vendor role
    await page.getByText('Vendor').click();

    await page.fill('input[type="email"]', VENDOR_EMAIL);
    await page.fill('input[type="password"]', VENDOR_PASS);
    await page.click('button:has-text("Sign In")');

    // Wait for navigation
    await page.waitForURL('**/vendor/dashboard', { timeout: 10000 });
    await expect(page.locator('text=Vendor Dashboard')).toBeVisible();

    // Visit new item page
    await page.goto('/vendor/items/new');
    await expect(page.locator('text=Create New Item')).toBeVisible();

    // Visit apply page (should probably redirect since user is already vendor or allowed)
    await page.goto('/vendor/apply');
    await expect(page.locator('text=Become a Vendor')).toBeVisible();
  });
});
