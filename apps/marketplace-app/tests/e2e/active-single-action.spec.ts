import { test, expect } from '@playwright/test';
import './global-hooks';

// Simple E2E: ensure only one active action area is visible when detail sheet is expanded
test('only one active action area visible when detail sheet is open', async ({ page }) => {
  test.setTimeout(60000);

  // Navigate to courier app login (try common hosts/ports)
  const hosts = ['127.0.0.1', 'localhost', '[::1]'];
  const ports = [5174, 5175];
  let navigated = false;
  for (const host of hosts) {
    for (const port of ports) {
      const url = `http://${host}:${port}/login`;
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 3000 });
        navigated = true;
        break;
      } catch (err) {
        // try next
      }
    }
    if (navigated) break;
  }
  if (!navigated) throw new Error('Failed to reach courier server');

  // Sign in minimal (assumes test user exists and seeds are in place)
  await page.fill('input[type="email"]', 'courier@sender.com');
  await page.fill('input[type="password"]', 'courier123');
  await page.click('button:has-text("Sign In as Senderr")');

  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Wait for Active Send to appear after a seeded job
  await expect(page.getByText('Active Send', { exact: false })).toBeVisible({ timeout: 15000 });

  // Expand the detail sheet (use the header open control if present)
  try {
    await page.click('button:has-text("Open")');
  } catch (e) {
    // fallback: click any visible View button
    try { await page.click('button:has-text("View")', { timeout: 3000 }); } catch (e) { /* ignore */ }
  }

  // Give UI a moment to settle
  await page.waitForTimeout(500);

  // Assert only one 'Arrived Pickup' action button exists in the DOM
  const arrivedButtons = await page.locator('button:has-text("Arrived Pickup")').count();
  expect(arrivedButtons).toBeLessThanOrEqual(1);
});
