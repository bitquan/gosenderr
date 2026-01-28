import { test, expect } from '@playwright/test';

const VENDOR_APP_URL = process.env.VITE_VENDOR_APP_URL ?? 'http://127.0.0.1:5181';

test.describe('Vendor pages basic load', () => {
  test('apply page loads and shows heading', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      window.__E2E_USER = { uid: 'vendor-uid', email: 'vendor@example.com', displayName: 'Vendor', role: 'vendor' };
    });
    await page.goto(`${VENDOR_APP_URL}/vendor/apply`);
    await expect(page.locator('text=Become a Vendor')).toBeVisible();
  });

  test('dashboard page loads and shows heading', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      window.__E2E_USER = { uid: 'vendor-uid', email: 'vendor@example.com', displayName: 'Vendor', role: 'vendor' };
    });
    await page.goto(`${VENDOR_APP_URL}/vendor/dashboard`);
    await expect(page.locator('text=Vendor Dashboard')).toBeVisible();
  });

  test('new item page loads and shows heading', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      window.__E2E_USER = { uid: 'vendor-uid', email: 'vendor@example.com', displayName: 'Vendor', role: 'vendor' };
    });
    await page.goto(`${VENDOR_APP_URL}/vendor/items/new`);
    await expect(page.locator('text=Create New Item')).toBeVisible();
  });
});
