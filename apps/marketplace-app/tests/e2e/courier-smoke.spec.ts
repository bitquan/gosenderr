import { test, expect } from '@playwright/test';
import './global-hooks';

const COURIER_EMAIL = 'courier@sender.com';
const COURIER_PASS = 'courier123';

test('courier can sign in and see dashboard', async ({ page }, testInfo) => {
  // Try multiple hosts/ports in case dev server binds to IPv6 or an alternate port
  const hosts = ['127.0.0.1', 'localhost', '[::1]'];
  const ports = [5174, 5175];
  let navigated = false;
  for (const host of hosts) {
    for (const port of ports) {
      const url = `http://${host}:${port}/login`;
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 3000 });
        console.info(`Navigated to ${url}`);
        navigated = true;
        break;
      } catch (err) {
        console.info(`Could not reach ${url}: ${err?.message ?? err}`);
      }
    }
    if (navigated) break;
  }
  if (!navigated) throw new Error('Failed to reach courier server on 127.0.0.1, localhost or [::1] ports 5174/5175');

  await page.fill('input[type="email"]', COURIER_EMAIL);
  await page.fill('input[type="password"]', COURIER_PASS);
  await page.click('button:has-text("Sign In as Senderr")');

  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await expect(page.getByRole('heading', { name: /Available Sends/ })).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: testInfo.outputPath('courier-dashboard.png'), fullPage: true });
});