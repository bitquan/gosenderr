import { test, expect } from '@playwright/test';

test.describe('Vendor Items - list route', () => {
  test('displays items on /vendor/items', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      window.__E2E_USER = { uid: 'vendor-uid', email: 'vendor@example.com' };
      // @ts-ignore
      window.__E2E_MARKETPLACE_ITEMS = [
        { id: 'item123', title: 'Listed Item', description: 'Desc', price: 100, status: 'active' }
      ];
    });

    await page.goto('/vendor/items');
    await expect(page.getByText('Listed Item')).toBeVisible();
  });
});