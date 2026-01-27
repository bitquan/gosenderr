import { test, expect } from '@playwright/test';

test.describe('Vendor Navbar Smoke @smoke', () => {
  test('has navigation and links', async ({ page }) => {
    // inject e2e user early
    await page.addInitScript(() => {
      // @ts-ignore
      window.__E2E_USER = { uid: 'vendor-uid', email: 'vendor@example.com' };
    });

    await page.goto('/vendor/dashboard');

    // Expect a global nav element (app should have a navbar across pages)
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Expect common vendor links
    await expect(page.getByRole('link', { name: /vendor dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /apply|become a vendor/i })).toBeVisible();
  });
});