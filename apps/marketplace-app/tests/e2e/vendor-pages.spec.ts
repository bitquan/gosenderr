import { test, expect } from '@playwright/test';

const VENDOR_EMAIL = 'vender@sender.com';
const VENDOR_PASS = 'admin123';

async function signInVendor(page: any) {
  await page.goto('/login');
  await page.getByText('Vendor').click();
  await page.fill('input[type="email"]', VENDOR_EMAIL);
  await page.fill('input[type="password"]', VENDOR_PASS);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/vendor/dashboard', { timeout: 10000 });
}

test.describe('Vendor pages basic load', () => {
  test('apply page loads and shows heading', async ({ page }) => {
    // Ensure app origin before clearing storage
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await expect(page.locator('text=Become a Vendor')).toBeVisible();
  });

  test('dashboard page loads and shows heading', async ({ page }) => {
    // Sign in as vendor before accessing protected page
    await signInVendor(page);
    await page.goto('/vendor/dashboard');
    await expect(page.locator('text=Vendor Dashboard')).toBeVisible();
  });

  test('new item page loads and shows heading', async ({ page }) => {
    // Sign in as vendor before accessing protected page
    await signInVendor(page);
    await page.goto('/vendor/items/new');
    await expect(page.locator('text=Create New Item')).toBeVisible();
  });
});
