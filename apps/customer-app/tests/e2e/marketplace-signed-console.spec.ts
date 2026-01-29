import { test } from '@playwright/test';

const VENDOR_EMAIL = 'vender@sender.com';
const VENDOR_PASS = 'admin123';

test('marketplace console when signed in', async ({ page }) => {
  page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()));
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
  await page.getByText('Vendor').click();
  await page.fill('input[type="email"]', VENDOR_EMAIL);
  await page.fill('input[type="password"]', VENDOR_PASS);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/vendor/dashboard');

  await page.goto('/marketplace');
  // wait for data fetch
  await page.waitForTimeout(3000);
});