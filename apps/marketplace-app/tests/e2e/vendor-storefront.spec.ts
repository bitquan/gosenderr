import { test, expect } from '@playwright/test'

test('vendor storefront loads and shows items', async ({ page }) => {
  // NOTE: Replace 'demo-seller' with seeded seller id when running locally
  await page.goto('/vendor/demo-seller')
  await expect(page.getByText('Loading seller storefront...')).not.toBeVisible()
  await expect(page.getByText(/Items/i)).toBeVisible()
})
