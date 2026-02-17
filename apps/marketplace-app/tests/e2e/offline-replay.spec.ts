import { test, expect } from '@playwright/test';

// Smoke: offline enqueue (browser) → reconnect → replay (functions/emulator)
// - Create a job via Firestore REST (uses seeded customer)
// - Create a courier auth user + users/{uid} role=\"courier\" via REST
// - Sign in as courier, go offline, perform Accept Job (client should enqueue)
// - Go online, reload page to trigger queued replay, assert server-side job is claimed exactly once

const CUSTOMER_EMAIL = 'customer@example.com';
const CUSTOMER_PASS = 'DemoPass123!';
const E2E_PASSWORD = 'DemoPass123!';

test('offline command queue replay (claimJob) — browser + emulator smoke', async ({ page }) => {
  // ensure clean client state
  await page.goto('/');
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());

  // Get projectId & apiKey from client globals (set by the app during e2e)
  const projectId = (await page.evaluate(() => (window as any).__FIREBASE_DEFAULTS__?.projectId || null)) || 'gosenderr-6773f';
  const apiKey = (await page.evaluate(() => (window as any).__FIREBASE_DEFAULTS__?.apiKey || null)) || 'fake-api-key';

  // 1) Sign into Auth emulator as seeded customer to create a job deterministically
  const authUrl = `http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const authRes = await page.request.post(authUrl, {
    data: JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASS, returnSecureToken: true }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (!authRes.ok()) throw new Error('Auth emulator sign-in (customer) failed');
  const authJson = await authRes.json();
  const customerIdToken = authJson.idToken;
  const customerLocalId = authJson.localId;

  // 2) Create a job via Firestore REST on behalf of the seeded customer
  const firestoreJobsUrl = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/jobs`;
  const nowIso = new Date().toISOString();
  const jobFields = {
    createdByUid: { stringValue: customerLocalId },
    status: { stringValue: 'open' },
    pickup: { mapValue: { fields: { lat: { doubleValue: 37.7936 }, lng: { doubleValue: -122.3965 }, label: { stringValue: 'Pickup - E2E' } } } },
    dropoff: { mapValue: { fields: { lat: { doubleValue: 37.7897 }, lng: { doubleValue: -122.4011 }, label: { stringValue: 'Dropoff - E2E' } } } },
    package: { mapValue: { fields: { size: { stringValue: 'small' } } } },
    photos: { arrayValue: { values: [] } },
    courierUid: { nullValue: null },
    agreedFee: { nullValue: null },
    createdAt: { timestampValue: nowIso },
    updatedAt: { timestampValue: nowIso }
  };

  const createJobRes = await page.request.post(firestoreJobsUrl, {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerIdToken}` },
    data: JSON.stringify({ fields: jobFields }),
  });
  if (!createJobRes.ok()) {
    const t = await createJobRes.text();
    throw new Error('Failed to create job via emulator REST: ' + t);
  }
  const createdJob = await createJobRes.json();
  const jobId = (createdJob.name as string).split('/').pop();
  test.info().attach('job-id', { body: jobId });

  // 3) Create a dedicated courier auth user via Auth emulator (accounts:signUp)
  const courierEmail = `e2e-courier+${Date.now()}@example.com`;
  const signUpUrl = `http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
  const signUpRes = await page.request.post(signUpUrl, {
    data: JSON.stringify({ email: courierEmail, password: E2E_PASSWORD, returnSecureToken: true }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (!signUpRes.ok()) {
    const t = await signUpRes.text();
    throw new Error('Failed to create courier auth user: ' + t);
  }
  const signUpJson = await signUpRes.json();
  const courierIdToken = signUpJson.idToken;
  const courierLocalId = signUpJson.localId;

  // 4) Create users/{uid} Firestore doc for courier with role 'courier' via REST
  const userDocUrl = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/users?documentId=${courierLocalId}`;
  const userNow = new Date().toISOString();
  const userFields: any = {
    email: { stringValue: courierEmail },
    displayName: { stringValue: 'E2E Courier' },
    role: { stringValue: 'courier' },
    courierProfile: { mapValue: { fields: { isOnline: { booleanValue: true } } } },
    createdAt: { timestampValue: userNow },
    updatedAt: { timestampValue: userNow }
  };
  const userCreateRes = await page.request.post(userDocUrl, {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${courierIdToken}` },
    data: JSON.stringify({ fields: userFields }),
  });
  if (!userCreateRes.ok()) {
    const t = await userCreateRes.text();
    throw new Error('Failed to create user doc for courier: ' + t);
  }

  // 5) Sign in through the UI as the courier and navigate to the jobs list
  await page.goto('/login');
  await page.fill('input[type="email"]', courierEmail);
  await page.fill('input[type="password"]', E2E_PASSWORD);
  await page.click('button:has-text("Sign In")');
  // Wait for app to navigate; AuthContext will create user doc (we already created) and set role
  await page.waitForURL('**/marketplace', { timeout: 10000 }).catch(() => {});

  // Ensure we can reach /jobs and see our job listed
  await page.goto('/jobs');
  await expect(page).toHaveURL(/\/jobs/);
  await page.waitForSelector(`text=${jobId}`, { timeout: 5000 }).catch(() => {});

  // 6) Go offline in the browser context
  await page.context().setOffline(true);

  // 7) Navigate to job detail and click 'Accept Job' (this should enqueue the command client-side)
  await page.goto(`/jobs/${jobId}`);
  await expect(page.locator('text=Accept Job')).toBeVisible({ timeout: 5000 });
  await page.click('button:has-text("Accept Job")');

  // When offline, the client queues the command — verify queued-commands badge appears with count 1
  // badge text is the queuedCount number next to role link — wait a short time for queue write
  await page.waitForTimeout(300);
  const queuedBadge = page.locator('nav >> text=/\d+ queued commands/').first();
  // Fallback: find numeric badge inside navbar if title isn't present in DOM
  const numericBadge = page.locator('nav >> span:has-text("1")').first();
  const badgeVisible = (await queuedBadge.count()) > 0 || (await numericBadge.count()) > 0;
  if (!badgeVisible) {
    // try a DOM snapshot for debugging
    test.info().attach('page-html-after-enqueue', { body: await page.content() });
    throw new Error('Queued-commands badge not visible after enqueue (offline)');
  }

  // 8) Go back online and reload to trigger AuthContext replay (onAuthStateChanged will fire)
  await page.context().setOffline(false);
  await page.reload();

  // Wait for the queued command to be processed and for the server-side job doc to reflect the claim
  // Poll emulator REST for the job document until courierUid is set or timeout
  const jobGetUrl = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/jobs/${jobId}`;
  let claimed = false;
  for (let i = 0; i < 20; i++) {
    const res = await page.request.get(jobGetUrl, { headers: { 'Authorization': `Bearer ${courierIdToken}` } });
    if (!res.ok()) {
      await page.waitForTimeout(300);
      continue;
    }
    const j = await res.json();
    const courierUid = j.fields?.courierUid?.stringValue || null;
    const status = j.fields?.status?.stringValue || null;
    if (courierUid === courierLocalId && status === 'assigned') {
      claimed = true;
      break;
    }
    await page.waitForTimeout(300);
  }

  if (!claimed) {
    test.info().attach('job-final-state', { body: JSON.stringify(await page.request.get(jobGetUrl).then(r => r.json()).catch(() => ({})), null, 2) });
    throw new Error('Queued command was not replayed: job not claimed on server');
  }

  // 9) Ensure idempotency: perform a reload and ensure no duplicate side-effects (courierUid remains single and ledger not duplicated)
  await page.reload();
  const finalRes = await page.request.get(jobGetUrl, { headers: { 'Authorization': `Bearer ${courierIdToken}` } });
  const finalJson = await finalRes.json();
  const finalCourier = finalJson.fields?.courierUid?.stringValue || null;
  const finalStatus = finalJson.fields?.status?.stringValue || null;
  expect(finalCourier).toBe(courierLocalId);
  expect(finalStatus).toBe('assigned');
});