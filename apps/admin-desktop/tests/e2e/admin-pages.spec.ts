import { test, expect } from '@playwright/test';

test.describe('Admin Desktop Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('Dashboard page loads without errors', async ({ page }) => {
    // Check for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check page title/heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    // Report any console errors
    if (errors.length > 0) {
      console.log('Dashboard errors:', errors);
    }
    
    expect(errors.length).toBe(0);
  });

  test('Users page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // Check for page content
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    if (errors.length > 0) {
      console.log('Users page errors:', errors);
    }
    
    expect(errors.length).toBe(0);
  });

  test('Orders page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    if (errors.length > 0) {
      console.log('Orders page errors:', errors);
    }
    
    expect(errors.length).toBe(0);
  });

  test('Jobs page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    if (errors.length > 0) {
      console.log('Jobs page errors:', errors);
    }
    
    expect(errors.length).toBe(0);
  });

  test('Sellers page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/vendors');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    if (errors.length > 0) {
      console.log('Sellers page errors:', errors);
    }
    
    expect(errors.length).toBe(0);
  });

  test('Feature Flags page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/feature-flags');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    if (errors.length > 0) {
      console.log('Feature Flags errors:', errors);
    }
    
    expect(errors.length).toBe(0);
  });

  test('Settings page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    if (errors.length > 0) {
      console.log('Settings page errors:', errors);
    }
    
    expect(errors.length).toBe(0);
  });

  test('System Check page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/system-check');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    if (errors.length > 0) {
      console.log('System Check errors:', errors);
    }
    
    expect(errors.length).toBe(0);
  });

  test('Logs page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/logs');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    if (errors.length > 0) {
      console.log('Logs page errors:', errors);
    }
    
    expect(errors.length).toBe(0);
  });

  test('Navigation works between pages', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation to Users
    await page.click('a[href="/users"]');
    await expect(page).toHaveURL(/.*users/);
    
    // Test navigation to Orders
    await page.click('a[href="/orders"]');
    await expect(page).toHaveURL(/.*orders/);
    
    // Test navigation back to Dashboard
    await page.click('a[href="/"]');
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:5176\/?$/);
  });
});
