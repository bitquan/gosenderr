import { test, expect } from '@playwright/test';

const VENDOR_EMAIL = 'vender@sender.com';
const VENDOR_PASS = 'admin123';
const VENDOR_APP_URL = process.env.VITE_VENDOR_APP_URL ?? 'http://127.0.0.1:5181';

test.describe('Vendor auth + pages', () => {
  test('can sign in as vendor and access vendor pages', async ({ page }) => {
    // Ensure vendor user is injected and navigate to vendor dashboard directly
    await page.addInitScript(() => {
      // @ts-ignore
      window.__E2E_USER = { uid: 'uid123', email: 'test+e2e@example.com', displayName: 'E2E', role: 'vendor' };
    });

    await page.goto(`${VENDOR_APP_URL}/vendor/dashboard`);

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
