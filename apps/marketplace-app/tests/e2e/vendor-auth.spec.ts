import { test, expect } from '@playwright/test';

const SELLER_EMAIL = 'seller@example.com';
const SELLER_PASS = 'DemoPass123!';

// Ensure a clean auth state before each test to avoid leaked sessions
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
});

test.describe('Seller auth + pages', () => {
  test('can sign in as seller and access seller pages', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', SELLER_EMAIL);
    await page.fill('input[type="password"]', SELLER_PASS);
    await page.click('button:has-text("Sign In")');

    // Login redirects to marketplace.
    await page.waitForURL('**/marketplace', { timeout: 10000 });

    // Visit seller pages.
    await page.goto('/seller/dashboard');
    await expect(page.locator('text=Seller Dashboard')).toBeVisible();

    await page.goto('/seller/items/new');
    await expect(page.locator('text=Create New Listing')).toBeVisible();

    await page.goto('/seller/apply');
    await expect(page.locator('text=Become a Seller')).toBeVisible();
  });
});
