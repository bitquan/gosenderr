import { test } from '@playwright/test';

const SELLER_EMAIL = 'seller@example.com';
const SELLER_PASS = 'DemoPass123!';

test('marketplace console when signed in', async ({ page }) => {
  page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()));
  await page.goto('/');
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
  await page.fill('input[type="email"]', SELLER_EMAIL);
  await page.fill('input[type="password"]', SELLER_PASS);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/marketplace');

  await page.goto('/marketplace');
  // wait for data fetch
  await page.waitForTimeout(3000);
});
