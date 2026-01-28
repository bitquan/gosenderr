import { test, expect } from '@playwright/test';

const VENDOR_EMAIL = 'vender@sender.com';
const VENDOR_PASS = 'admin123';

test('seeded item appears in marketplace when signed in', async ({ page }) => {
  // Inject a fake authenticated vendor user and visit marketplace directly
  await page.addInitScript(() => {
    // @ts-ignore
    window.__E2E_USER = { uid: 'uid123', email: 'vender@sender.com', displayName: 'Vendor' };
  });
  await page.goto('/marketplace');

  // Now visit marketplace
  await page.goto('/marketplace');
  // Ensure at least one marketplace item is visible
  const firstItem = page.locator('a[href^="/marketplace/"]').first();
  await expect(firstItem).toBeVisible({ timeout: 10000 });
});
