import { test, expect } from '@playwright/test';

const SELLER_EMAIL = 'seller@example.com';
const SELLER_PASS = 'DemoPass123!';

async function signInSeller(page: any) {
  await page.goto('/login');
  await page.fill('input[type="email"]', SELLER_EMAIL);
  await page.fill('input[type="password"]', SELLER_PASS);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/marketplace', { timeout: 10000 });
}

test.describe('Seller pages basic load', () => {
  test('apply page loads and shows heading', async ({ page }) => {
    // Ensure app origin before clearing storage
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto('/seller/apply');
    await expect(page.locator('text=Become a Seller')).toBeVisible();
  });

  test('dashboard page loads and shows heading', async ({ page }) => {
    await signInSeller(page);
    await page.goto('/seller/dashboard');
    await expect(page.locator('text=Seller Dashboard')).toBeVisible();
  });

  test('new item page loads and shows heading', async ({ page }) => {
    await signInSeller(page);
    await page.goto('/seller/items/new');
    await expect(page.locator('text=Create New Listing')).toBeVisible();
  });
});
