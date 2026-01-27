import { test, expect } from '@playwright/test';

test.describe('Vendor Items - create (happy path)', () => {
  test('creates a new item and redirects to dashboard', async ({ page }) => {
    // inject vendor user early
    await page.addInitScript(() => {
      // @ts-ignore
      window.__E2E_USER = { uid: 'vendor-uid', email: 'vendor@example.com' };
    });

    let wrote = false;

    // intercept Firestore write for marketplaceItems
    await page.route('**/projects/**/databases/**/documents/marketplaceItems*', (route) => {
      wrote = true;
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ name: 'projects/test/databases/(default)/documents/marketplaceItems/item123' }) });
    });

    await page.goto('/vendor/items/new');

    await page.fill('input[placeholder="Title"]', 'E2E Item');
    await page.fill('textarea[placeholder="Description"]', 'Item description');
    await page.fill('input[placeholder="Price"]', '99');

    await Promise.all([
      page.waitForURL('**/vendor/dashboard'),
      page.click('button:has-text("Create Item")'),
    ]);

    expect(wrote).toBeTruthy();
    await expect(page.getByText('No items yet', { exact: false })).toBeVisible();
  });
});