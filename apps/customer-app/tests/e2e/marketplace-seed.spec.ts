import { test, expect } from '@playwright/test';

const VENDOR_EMAIL = 'vender@sender.com';
const VENDOR_PASS = 'admin123';

test('seeded item appears in marketplace when signed in', async ({ page }) => {
  await page.goto('/login');
  await page.getByText('Vendor').click();
  await page.fill('input[type="email"]', VENDOR_EMAIL);
  await page.fill('input[type="password"]', VENDOR_PASS);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/vendor/dashboard');

  // Now visit marketplace
  await page.goto('/marketplace');
  // Ensure at least one marketplace item is visible
  const firstItem = page.locator('a[href^="/marketplace/"]').first();
  await expect(firstItem).toBeVisible({ timeout: 10000 });
});
