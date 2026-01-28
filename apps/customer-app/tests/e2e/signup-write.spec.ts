import { test, expect } from '@playwright/test';

test('Signup triggers user doc write (happy path)', async ({ page }) => {
  await page.goto('/signup');

  let writeCalled = false;

  // Match firestore document writes in emulator or production endpoints
  await page.route(/\/documents\/users.*/, (route) => {
    writeCalled = true;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  await page.fill('input[placeholder="Your name"]', 'Test User');
  await page.fill('input[placeholder="you@example.com"]', 'test+e2e@example.com');
  await page.fill('input[placeholder="Choose a password"]', 'password123');

  // Intercept signup request (identitytoolkit) so auth resolves (include minimal fields expected by SDK)
  await page.route('**/identitytoolkit.googleapis.com/**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ idToken: 'fake-token', refreshToken: 'r', expiresIn: '3600', localId: 'uid123', email: 'test+e2e@example.com', providerUserInfo: [] }) });
  });

  // Ensure alert does not block
  page.once('dialog', async (d) => await d.accept());

  await Promise.all([
    page.waitForURL('/login'),
    page.click('button[type="submit"]'),
  ]);

  expect(writeCalled).toBeTruthy();
});