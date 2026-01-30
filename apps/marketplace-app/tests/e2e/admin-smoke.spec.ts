import { test, expect } from '@playwright/test';
import './global-hooks';

// Admin smoke: sign in and check admin dashboard
const ADMIN_EMAIL = 'admin@sender.com';
const ADMIN_PASS = 'admin123';

test('admin can sign in and see dashboard', async ({ page }, testInfo) => {
  // Try common dev hosts and ports so tests are resilient to port fallbacks
  const hosts = ['127.0.0.1', 'localhost', '[::1]'];
  const ports = [3000, 3001];
  let navigated = false;

  for (const host of hosts) {
    for (const port of ports) {
      const url = `http://${host}:${port}/login`;
      try {
        // short timeout so we move quickly through candidates
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

  if (!navigated) {
    throw new Error('Failed to reach admin server on 127.0.0.1, localhost or [::1] ports 3000/3001');
  }

  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button:has-text("Sign In")');

  // Wait for dashboard or redirect (accept either /dashboard or /admin/dashboard)
  await page.waitForURL(/\/(admin\/)?dashboard(\/.*)?/, { timeout: 15000 });
  // Some apps keep open connections; wait for the dashboard heading instead of networkidle
  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: testInfo.outputPath('admin-dashboard.png'), fullPage: true });
});