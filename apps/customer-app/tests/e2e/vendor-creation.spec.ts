import { test, expect } from '@playwright/test';

const VENDOR_APP_URL = process.env.VITE_VENDOR_APP_URL ?? 'http://127.0.0.1:5181';

test('Vendor can create a new item (happy path)', async ({ page }) => {
  // Ensure vendor app sees a logged-in vendor
  await page.addInitScript(() => {
    // @ts-ignore
    window.__E2E_USER = { uid: 'vendor-uid', email: 'vendor@example.com', displayName: 'Vendor' };
  });

  let writeCalled = false;

  // Intercept Firestore add doc call and mark writeCalled (matches emulator or prod)
  await page.route(/\/documents\/marketplaceItems.*/, (route) => {
    writeCalled = true;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ name: 'projects/test-project/databases/(default)/documents/marketplaceItems/item123' }) });
  });

  await page.goto(`${VENDOR_APP_URL}/vendor/items/new`);

  await page.fill('input[placeholder="Title"]', 'Test Item');
  await page.fill('textarea[placeholder="Description"]', 'A great test item');
  await page.fill('input[placeholder="Price"]', '42');

  await page.click('button:has-text("Create Item")');
  // Wait for the firestore response (emulator or prod endpoint)
  await page.waitForResponse((resp) => resp.url().includes('/documents/marketplaceItems') && resp.status() === 200, { timeout: 10000 });

  expect(writeCalled).toBeTruthy();
});