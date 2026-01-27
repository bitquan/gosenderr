import { test, expect } from '@playwright/test';

test.describe('Vendor Apply Smoke @smoke', () => {
  test('renders apply page and submits (E2E interception)', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      window.__E2E_USER = { uid: 'vendor-uid', email: 'vendor@example.com' };
      // @ts-ignore
      window.__E2E_ON_APPLY = (payload: any) => { (window as any).__E2E_APPLIED = payload; };
    });

    await page.goto('/vendor/apply');

    await expect(page.getByRole('heading', { name: /become a vendor/i })).toBeVisible();

    await page.fill('input[placeholder="Your Business Name"]', 'Test Business');
    await page.selectOption('select', 'individual');
    await page.fill('textarea[placeholder="Tell us about your business and what you\'ll be selling..."]', 'We sell stuff');
    await page.fill('input[placeholder="(555) 555-5555"]', '(555) 555-5555');

    await page.check('#terms');

    await Promise.all([
      page.waitForURL('**/vendor/dashboard'),
      page.click('button:has-text("Submit Application")'),
    ]);

    const applied = await page.evaluate(() => (window as any).__E2E_APPLIED);
    expect(applied).toBeTruthy();
  });
});