import { test } from '@playwright/test';

test('debug apply page content', async ({ page }) => {
  await page.goto('/seller/apply');
  console.log('\n--- PAGE HTML START ---\n');
  const html = await page.content();
  console.log(html.slice(0, 3000));
  console.log('\n--- PAGE HTML END ---\n');
  await page.screenshot({ path: 'test-apply-screenshot.png', fullPage: true });
});
