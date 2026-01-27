import { test, expect } from '@playwright/test';

test.describe('Vendor Items - create (happy path)', () => {
  test('creates a new item and redirects to dashboard', async ({ page }) => {
    // inject vendor user early
    await page.addInitScript(() => {
      // @ts-ignore
      window.__E2E_USER = { uid: 'vendor-uid', email: 'vendor@example.com' };
    });

    page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()));
    page.on('request', (req) => {
      if (req.url().includes('firestore') || req.url().includes('documents')) console.log('REQ:', req.method(), req.url());
    });

    let wrote = false;

    // E2E handler: set a flag when create is called
    await page.addInitScript(() => {
      // @ts-ignore
      window.__E2E_ON_CREATE = (item: any) => { window.__E2E_CREATED = item; };
    });

    await page.goto('/vendor/items/new');

    await page.fill('input[placeholder="Title"]', 'E2E Item');
    await page.fill('textarea[placeholder="Description"]', 'Item description');
    await page.fill('input[placeholder="Price"]', '99');

    await Promise.all([
      page.waitForURL('**/vendor/dashboard'),
      page.click('button:has-text("Create Item")'),
    ]);

    const created = await page.evaluate(() => (window as any).__E2E_CREATED);
    expect(created).toBeTruthy();
    await expect(page.getByText('No items yet', { exact: false })).toBeVisible();
  });
});