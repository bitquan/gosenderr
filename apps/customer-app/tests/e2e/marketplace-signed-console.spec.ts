import { test } from '@playwright/test';

const VENDOR_EMAIL = 'vender@sender.com';
const VENDOR_PASS = 'admin123';

test('marketplace console when signed in', async ({ page }) => {
  page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()));
  // Inject authenticated user and open marketplace without relying on removed role toggle
  await page.addInitScript(() => {
    // @ts-ignore
    window.__E2E_USER = { uid: 'uid123', email: 'vender@sender.com', displayName: 'Vendor' };
  });
  await page.goto('/marketplace');
  // wait for data fetch
  await page.waitForTimeout(3000);
});