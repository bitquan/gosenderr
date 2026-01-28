import { test, expect } from '@playwright/test';

test.describe('Vendor pages basic load', () => {
  test('apply page loads and shows heading', async ({ page }) => {
    await page.goto('/vendor/apply');
    await expect(page.locator('text=Become a Vendor')).toBeVisible();
  });

  test('dashboard page loads and shows heading', async ({ page }) => {
    await page.goto('/vendor/dashboard');
    await expect(page.locator('text=Vendor Dashboard')).toBeVisible();
  });

  test('new item page loads and shows heading', async ({ page }) => {
    await page.goto('/vendor/items/new');
    await expect(page.locator('text=Create New Item')).toBeVisible();
  });
});
