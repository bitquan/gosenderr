import { test, expect } from '@playwright/test';

test('Vendor dashboard visual snapshot @visual', async ({ page }) => {
  await page.addInitScript(() => {
    // @ts-ignore
    window.__E2E_USER = { uid: 'vendor-uid', email: 'vendor@example.com' };
  });

  await page.goto('/vendor/dashboard');
  await expect(page).toHaveScreenshot('vendor-dashboard.png');
});