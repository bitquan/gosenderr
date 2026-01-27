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
    // Heading uses the user's display name (injected in CI) or a generic welcome — check for either
    await expect(page.getByRole('heading', { name: /smoke|welcome/i })).toBeVisible();
    // Saved Addresses section has an "+ Add" action on the dashboard (stable presence)
    await expect(page.getByRole('button', { name: /\+ Add/i })).toBeVisible();
    // Marketplace Orders may take longer to render in CI; allow a longer timeout
    await expect(page.getByText(/marketplace orders/i)).toBeVisible({ timeout: 10000 });
  });
});