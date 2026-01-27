import { test, expect } from '@playwright/test';

test.describe('Vendor Dashboard Smoke @smoke', () => {
  test('renders vendor dashboard and CTA', async ({ page }) => {
    // inject e2e user early
    await page.addInitScript(() => {
      // @ts-ignore
      window.__E2E_USER = { uid: 'vendor-uid', email: 'vendor@example.com' };
    });

    await page.goto('/vendor/dashboard');
    await expect(page.getByRole('heading', { name: /vendor dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /\+ new item/i })).toBeVisible();
  });
});