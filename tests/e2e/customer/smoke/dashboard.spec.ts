import { test, expect } from '@playwright/test';

test.describe('Customer Dashboard Smoke @smoke', () => {
  test('renders dashboard with critical elements', async ({ page }) => {
    // Inject a fake auth user for E2E smoke runs so dashboard is reachable in CI
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.__E2E_USER = { uid: 'smoke-uid', email: 'smoke@example.com', displayName: 'Smoke' };
    });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/active jobs/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /new delivery/i })).toBeVisible();
  });
});