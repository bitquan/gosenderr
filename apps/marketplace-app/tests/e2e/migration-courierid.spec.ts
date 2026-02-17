import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const E2E_PASSWORD = 'DemoPass123!';

// Ensures migration script removes legacy `courierId` and sets `courierUid`.
// This test seeds docs with `courierId`, runs the migration with --remove-old,
// and asserts `courierId` is removed and `courierUid` is present.

test('migration removes legacy courierId fields and sets courierUid', async ({ page }) => {
  await page.goto('/');
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());

  const projectId = (await page.evaluate(() => (window as any).__FIREBASE_DEFAULTS__?.projectId || null)) || 'gosenderr-6773f';
  const apiKey = (await page.evaluate(() => (window as any).__FIREBASE_DEFAULTS__?.apiKey || null)) || 'fake-api-key';

  // Create courier auth user
  const courierEmail = `e2e-courier+${Date.now()}@example.com`;
  const signUpUrl = `http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
  const signUpRes = await page.request.post(signUpUrl, {
    data: JSON.stringify({ email: courierEmail, password: E2E_PASSWORD, returnSecureToken: true }),
    headers: { 'Content-Type': 'application/json' },
  });
  expect(signUpRes.ok()).toBeTruthy();
  const signUpJson = await signUpRes.json();
  const courierIdToken = signUpJson.idToken as string;
  const courierLocalId = signUpJson.localId as string;

  // create users/{uid} doc with role=courier (rules require a profile)
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

  // Create a job doc and an order doc that use the legacy courierId

  const jobsUrl = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/jobs`;
  const jobFields: any = {
    createdByUid: { stringValue: courierLocalId },
    status: { stringValue: 'open' },
    pickup: { mapValue: { fields: { lat: { doubleValue: 37.79 }, lng: { doubleValue: -122.40 } } } },
    dropoff: { mapValue: { fields: { lat: { doubleValue: 37.78 }, lng: { doubleValue: -122.41 } } } },
    courierId: { stringValue: courierLocalId },
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

  // Run the migration script with --remove-old (emulator only)
  const scriptPath = path.resolve(process.cwd(), '../../scripts/migrate-courierid-to-courieruid.js');
  const res = spawnSync('node', [scriptPath, '--remove-old'], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }, stdio: 'inherit' });
  expect(res.status).toBe(0);

  // Re-read the job document and assert courierUid exists and courierId is removed
  const getJobRes = await page.request.get(`http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/jobs/${jobId}`, { headers: { 'Authorization': `Bearer ${courierIdToken}` } });
  expect(getJobRes.ok()).toBeTruthy();
  const jobDoc = await getJobRes.json();
  const jobFieldsResp = jobDoc.fields || {};
  expect(jobFieldsResp.courierUid).toBeDefined();
  expect(jobFieldsResp.courierId).toBeUndefined();
  expect(jobFieldsResp.courierUid.stringValue).toBe(courierLocalId);


});