import { test, expect } from '@playwright/test'

// Verifies that a courier can read legacy jobs (courierId) on the Earnings page
// (regression test for Firestore rules allowing `courierId` legacy field).

const E2E_PASSWORD = 'DemoPass123!'

test('courier can read legacy jobs (courierId) on /earnings', async ({ page }) => {
  await page.goto('/');
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());

  const projectId = (await page.evaluate(() => (window as any).__FIREBASE_DEFAULTS__?.projectId || null)) || 'gosenderr-6773f';
  const apiKey = (await page.evaluate(() => (window as any).__FIREBASE_DEFAULTS__?.apiKey || null)) || 'fake-api-key';

  // 1) create courier auth user
  const courierEmail = `e2e-courier+${Date.now()}@example.com`;
  const signUpUrl = `http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
  const signUpRes = await page.request.post(signUpUrl, {
    data: JSON.stringify({ email: courierEmail, password: E2E_PASSWORD, returnSecureToken: true }),
    headers: { 'Content-Type': 'application/json' },
  });
  expect(signUpRes.ok()).toBeTruthy();
  const signUpJson = await signUpRes.json();
  const courierIdToken = signUpJson.idToken;
  const courierLocalId = signUpJson.localId;

  // 2) create users/{uid} doc with role=courier
  const userDocUrl = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/users?documentId=${courierLocalId}`;
  const nowIso = new Date().toISOString();
  const userFields = {
    email: { stringValue: courierEmail },
    displayName: { stringValue: 'E2E Courier' },
    role: { stringValue: 'courier' },
    courierProfile: { mapValue: { fields: { isOnline: { booleanValue: true } } } },
    createdAt: { timestampValue: nowIso },
    updatedAt: { timestampValue: nowIso }
  };
  const userCreateRes = await page.request.post(userDocUrl, {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${courierIdToken}` },
    data: JSON.stringify({ fields: userFields }),
  });
  expect(userCreateRes.ok()).toBeTruthy();

  // 3) create a LEGACY job that uses courierId (not courierUid)
  const jobsUrl = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/jobs`;
  const jobFields: any = {
    createdByUid: { stringValue: courierLocalId },
    status: { stringValue: 'completed' },
    pickup: { mapValue: { fields: { lat: { doubleValue: 37.79 }, lng: { doubleValue: -122.40 }, label: { stringValue: 'Pickup - E2E' } } } },
    dropoff: { mapValue: { fields: { lat: { doubleValue: 37.78 }, lng: { doubleValue: -122.41 }, label: { stringValue: 'Dropoff - E2E' } } } },
    package: { mapValue: { fields: { size: { stringValue: 'small' } } } },
    photos: { arrayValue: { values: [] } },
    courierId: { stringValue: courierLocalId },
    agreedFee: { doubleValue: 12.34 },
    createdAt: { timestampValue: nowIso },
    updatedAt: { timestampValue: nowIso }
  };

  const createJobRes = await page.request.post(jobsUrl, {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${courierIdToken}` },
    data: JSON.stringify({ fields: jobFields }),
  });
  expect(createJobRes.ok()).toBeTruthy();
  const createdJob = await createJobRes.json();
  const jobId = (createdJob.name as string).split('/').pop();

  // 4) Sign in via UI as the courier and navigate to /earnings
  await page.goto('/login');
  await page.fill('input[type="email"]', courierEmail);
  await page.fill('input[type="password"]', E2E_PASSWORD);

  const consoleErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });

  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/marketplace', { timeout: 10000 }).catch(() => {});

  // navigate to earnings and wait a moment for snapshots to subscribe
  await page.goto('/earnings');
  await page.waitForTimeout(1000);

  // Ensure no permission-denied error appeared in console
  expect(consoleErrors.join('\n')).not.toContain('Missing or insufficient permissions');

  // Also check completed job appears in earnings UI (by job id string present in page content)
  const pageText = await page.textContent('body');
  expect(pageText).toContain(jobId);
});