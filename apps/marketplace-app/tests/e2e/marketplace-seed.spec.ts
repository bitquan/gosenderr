import { test, expect } from '@playwright/test';

const SELLER_EMAIL = 'seller@example.com';
const SELLER_PASS = 'DemoPass123!';

test('seeded item appears in marketplace when signed in', async ({ page }) => {
  await page.goto('/');
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
  await page.fill('input[type="email"]', SELLER_EMAIL);
  await page.fill('input[type="password"]', SELLER_PASS);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/marketplace');

  // Confirm seller route access, then validate marketplace listing visibility.
  await page.goto('/seller/dashboard');
  await expect(page.locator('text=Seller Dashboard')).toBeVisible();
  await page.goto('/marketplace');
  const firstItem = page.locator('a[href^="/marketplace/"]').first();
  await expect(firstItem).toBeVisible({ timeout: 10000 });
});
