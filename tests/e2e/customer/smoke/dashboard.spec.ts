import { test, expect } from '@playwright/test';

test.describe('Customer Dashboard Smoke @smoke', () => {
  test('renders dashboard with critical elements', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/active jobs/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /new delivery/i })).toBeVisible();
  });
});