import { test } from '@playwright/test';

test('debug vendor sign-in with detailed logs', async ({ page }) => {
  page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  await page.goto('/login');
  await page.getByText('Vendor').click();
  await page.fill('input[type="email"]', 'vender@sender.com');
  await page.fill('input[type="password"]', 'admin123');

  // Intercept network requests to auth emulator and firestore
  page.on('request', req => {
    if (req.url().includes('identitytoolkit.googleapis.com') || req.url().includes('/google.firestore')) {
      console.log('REQ =>', req.method(), req.url());
    }
  });
  page.on('response', async res => {
    if (res.url().includes('identitytoolkit.googleapis.com') || res.url().includes('/google.firestore')) {
      console.log('RES <=', res.status(), res.url());
      try { console.log(await res.text()); } catch (e) {}
    }
  });

  await page.click('button:has-text("Sign In")');

  // wait a bit and dump storage/cookies
  await page.waitForTimeout(2000);
  const ls = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  console.log('LOCALSTORAGE:', JSON.stringify(ls, null, 2));
  const cookies = await page.context().cookies();
  console.log('COOKIES:', JSON.stringify(cookies, null, 2));
});