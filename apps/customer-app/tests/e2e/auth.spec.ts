import { test, expect } from '@playwright/test';

const VENDOR_APP_URL = process.env.VITE_VENDOR_APP_URL ?? 'https://gosenderr-vendor.web.app';

test.describe('Auth & vendor link tests', () => {
  // Ensure tests inject a fake authenticated user early and stub user document reads so
  // settings page reliably shows the vendor apply CTA when running in the VSCode extension
  test.beforeEach(async ({ page }) => {
    // Inject a fake authenticated user before any script runs
    await page.addInitScript(() => {
      // @ts-ignore - test helper
      window.__E2E_USER = { uid: 'uid123', email: 'test+e2e@example.com', displayName: 'E2E' };
    });

    // Global stub for user doc reads
    await page.route('**/projects/**/databases/**/documents/users/*', (route) => {
      const body = {
        name: `projects/test-project/databases/(default)/documents/users/uid123`,
        fields: {
          role: { stringValue: 'customer' }
        },
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      } as any;
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    // Forward page console to the test runner to help debugging
    page.on('console', (msg) => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
  });

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
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          idToken: 'fake-token',
          refreshToken: 'refresh-token',
          expiresIn: '3600',
          localId: 'uid123',
        }),
      });
    });

    // Intercept Firestore writes/reads (matches emulator or production document endpoints)
    await page.route(/\/documents\//, (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    // Log page console messages to the test output to help debugging
    page.on('console', (msg) => {
      console.log('PAGE LOG:', msg.text());
    });

    // Accept alert that appears after signup to avoid blocking the page
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.click('button[type="submit"]');

    // After successful submit we redirect to /login (per implementation)
    await page.waitForURL('/login', { timeout: 5000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('Vendor apply link opens vendor app', async ({ page, context }) => {
    // Attach console listeners for debugging
    page.on('console', (msg) => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

    // Set fake authenticated user BEFORE navigation so AuthProvider picks it up on load
    await page.addInitScript(() => {
      // @ts-ignore - test helper
      window.__E2E_USER = { uid: 'uid123', email: 'test+e2e@example.com', displayName: 'E2E' };
    });

    // Stub Firestore reads for the user's doc with a proper document shape (no vendor application)
    await page.route('**/projects/**/databases/**/documents/users/*', (route) => {
      const body = {
        name: `projects/test-project/databases/(default)/documents/users/uid123`,
        fields: {
          role: { stringValue: 'customer' }
        },
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      } as any;
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.goto('/settings');

    // Wait for the settings content to render (either the vendor card or an indication it's not present)
    const applyLink = page.locator('a:has-text("Apply Now")');
    await page.waitForTimeout(1000);

    if (!(await applyLink.count())) {
      console.log('DEBUG: Apply Now link not found — dumping settings HTML:');
      const html = await page.content();
      console.log(html.slice(0, 8000));
      // Also dump any console messages collected on the page
    }

    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      applyLink.click({ timeout: 60000 }),
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
