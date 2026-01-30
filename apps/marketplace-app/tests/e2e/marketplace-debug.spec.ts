import { test } from '@playwright/test';
import './global-hooks';

test('debug marketplace content', async ({ page }) => {
  await page.goto('/marketplace');
  const html = await page.content();
  console.log('\n--- MARKETPLACE HTML START ---\n');
  console.log(html.slice(0, 8000));
  console.log('\n--- MARKETPLACE HTML END ---\n');
});
