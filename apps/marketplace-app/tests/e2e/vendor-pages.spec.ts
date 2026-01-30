import { test, expect } from '@playwright/test';
import './global-hooks';
import { captureStep } from './test-helpers';
const VENDOR_EMAIL = 'vender@sender.com';
const VENDOR_PASS = 'admin123';

async function signInVendor(page: any, testInfo: any) {
  await page.goto('/login');
  await captureStep(page, testInfo, 'signin-login');

  await page.getByText('Vendor').click();
  await captureStep(page, testInfo, 'signin-role-selected');

  await page.fill('input[type="email"]', VENDOR_EMAIL);
  await page.fill('input[type="password"]', VENDOR_PASS);
  await page.click('button:has-text("Sign In")');
  await captureStep(page, testInfo, 'signin-submitted');

  // Capture localStorage and cookies immediately after sign-in submission (in case navigation doesn't occur)
  try {
    const keys = await page.evaluate(() => Object.keys(localStorage));
    const authItems: Record<string, string | null> = {};
    for (const k of keys) {
      if (k.includes('firebase') || k.toLowerCase().includes('auth') || k.includes('user')) {
        authItems[k] = localStorage.getItem(k);
      }
    }
    await testInfo.attach('localStorage-post-submit.json', { body: JSON.stringify(authItems, null, 2), contentType: 'application/json' });

    const cookies = await page.context().cookies();
    await testInfo.attach('cookies-post-submit.json', { body: JSON.stringify(cookies, null, 2), contentType: 'application/json' });
  } catch (err) {
    console.warn('Failed to attach auth debug info', err);
  }

  await page.waitForURL('**/vendor/dashboard', { timeout: 10000 });
  await captureStep(page, testInfo, 'signin-complete-dashboard');

  // Capture localStorage and cookies to help debug auth state issues
  try {
    const ls = await page.evaluate(() => Object.entries(localStorage));
    const authItems: Record<string, string | null> = {};
    for (const [k, v] of ls) {
      if (k.includes('firebase') || k.toLowerCase().includes('auth') || k.includes('user')) {
        authItems[k] = v;
      }
    }
    await testInfo.attach('localStorage.json', { body: JSON.stringify(authItems, null, 2), contentType: 'application/json' });

    const cookies = await page.context().cookies();
    await testInfo.attach('cookies.json', { body: JSON.stringify(cookies, null, 2), contentType: 'application/json' });
  } catch (err) {
    console.warn('Failed to attach auth debug info', err);
  }
}

test.describe('Vendor pages basic load', () => {
  test('apply page loads and shows heading', async ({ page }) => {
    // Ensure app origin before clearing storage
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await expect(page.locator('text=Become a Vendor')).toBeVisible();
  });

  test('dashboard page loads and shows heading', async ({ page }, testInfo) => {
    // Sign in as vendor before accessing protected page
    await signInVendor(page, testInfo);
    await page.goto('/vendor/dashboard');
    await captureStep(page, testInfo, 'vendor-dashboard-loaded');
    await expect(page.getByRole('heading', { name: 'Vendor Dashboard' })).toBeVisible();
  });

  test('new item page loads and shows heading', async ({ page }, testInfo) => {
    // Sign in as vendor before accessing protected page
    await signInVendor(page, testInfo);
    await page.goto('/vendor/items/new');
    await captureStep(page, testInfo, 'vendor-new-item-loaded');
    await expect(page.locator('text=Create New Item')).toBeVisible();
  });
});
