import { test } from '@playwright/test';
import './global-hooks';

test('marketplace debug console', async ({ page }) => {
  page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()));
  await page.goto('/marketplace');
  // wait for client-side data fetch
  await page.waitForTimeout(3000);
});
