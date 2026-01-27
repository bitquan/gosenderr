import { test, expect } from '@playwright/test';

const VENDOR_APP_URL = process.env.VITE_VENDOR_APP_URL ?? 'https://gosenderr-vendor.web.app';

test.describe('Auth & vendor link tests', () => {
  test('Login page is customer-only and sign button text is correct', async ({ page }) => {
    await page.goto('/login');

    // Ensure role selector removed (no vendor/customer toggle present)
    const roleButtons = await page.locator('button:has-text("Customer")').count();
    expect(roleButtons).toBeLessThan(1);

    // Sign in button text
    await expect(page.locator('button[type="submit"]')).toHaveText(/Sign In/);
  });

  test('Signup form validation and submission (mock signup request)', async ({ page }) => {
    await page.goto('/signup');

    // Try submitting empty form and assert validation prevents submit
    await page.click('button[type="submit"]');

    // Required fields should show HTML validation; ensure we stay on page
    await expect(page).toHaveURL(/\/signup$/);

    // Fill fields
    await page.fill('input[placeholder="Your name"]', 'Test User');
    await page.fill('input[placeholder="you@example.com"]', 'test+e2e@example.com');
    await page.fill('input[placeholder="Choose a password"]', 'password123');

    // Intercept Firebase signUp network request and stub success
    await page.route('**/identitytoolkit.googleapis.com/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ idToken: 'fake', localId: 'uid123' }) });
    });

    // Intercept Firestore write for users doc
    await page.route('**/firestore.googleapis.com/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.click('button[type="submit"]');

    // After successful submit we redirect to /login (per implementation)
    await page.waitForURL('/login', { timeout: 5000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('Vendor apply link opens vendor app', async ({ page, context }) => {
    // Ensure settings page contains external vendor apply link
    await page.goto('/settings');

    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('a:has-text("Apply Now")'),
    ]);

    await newPage.waitForLoadState('domcontentloaded');
    expect(newPage.url()).toContain(`${VENDOR_APP_URL.replace(/^https?:\/\//, '')}`);
  });

  test('Direct vendor route returns not found (customer app)', async ({ page }) => {
    await page.goto('/vendor/apply');
    // Expect not found or redirect to login/home; ensure not vendor app content
    await expect(page).not.toHaveURL(/\/vendor\/apply$/);
  });
});
