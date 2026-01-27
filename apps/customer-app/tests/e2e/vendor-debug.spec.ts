import { test } from '@playwright/test';

test('Vendor debug', async ({ page }) => {
  page.on('console', (msg) => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  await page.goto('http://127.0.0.1:5181');
  await page.waitForTimeout(1600);
  const html = await page.content();
  console.log('\n=== VENDOR PAGE HTML START ===\n');
  console.log(html.slice(0, 2000));
  console.log('\n=== VENDOR PAGE HTML END ===\n');
});