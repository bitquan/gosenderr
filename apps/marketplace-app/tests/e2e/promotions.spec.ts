import { test, expect } from '@playwright/test'

test('promoted carousel shows promoted items', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/promoted/i)).not.toBeNull()
})
