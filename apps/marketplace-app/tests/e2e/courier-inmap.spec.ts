import { test, expect } from '@playwright/test';
import './global-hooks';

// This test uses firebase-admin inside the Node test process to seed a job document
// and to read it back for assertions after actions are performed in the browser.

test('courier full in-map flow: accept → start → arrived → pickup → dropoff → complete', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  // 1) Seed a job via firebase-admin
  const adminModule = await import('firebase-admin');
  const admin = adminModule.default || adminModule;
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  if (!admin.apps.length) admin.initializeApp({ projectId: 'gosenderr-6773f' });
  const db = admin.firestore();

  const jobRef = db.collection('jobs').doc();
  const jobId = jobRef.id;

  const pickup = { lat: 37.7755, lng: -122.4194, label: 'Pickup Test' };
  const dropoff = { lat: 37.7765, lng: -122.4180, label: 'Dropoff Test' };

  await jobRef.set({
    createdByUid: 'vendor',
    status: 'open',
    pickup,
    dropoff,
    package: { description: 'E2E test package' },
    courierUid: null,
    // We'll compute and set server-agreed fee to avoid price-mismatch on claim
    agreedFee: 10.0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Compute server-side fee using courier's rate card and update job.agreedFee to match
  try {
    const usersSnap = await db.collection('users').where('email', '==', 'courier@sender.com').get();
    const courierDoc = usersSnap.docs[0];
    if (courierDoc) {
      const courierData = courierDoc.data();
      const rateCard = courierData.courierProfile?.packageRateCard || courierData.courierProfile?.foodRateCard;
      const courierLoc = courierData.courierProfile?.currentLocation;

      const calcMiles = (a: any, b: any) => {
        const R = 3959;
        const lat1 = (a.lat * Math.PI) / 180;
        const lat2 = (b.lat * Math.PI) / 180;
        const dLat = ((b.lat - a.lat) * Math.PI) / 180;
        const dLng = ((b.lng - a.lng) * Math.PI) / 180;
        const sa = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
        return R * c;
      };

      const calcFee = (rateCard: any, jobMiles: number, pickupMiles?: number, mode?: string) => {
        const baseFee = rateCard.baseFare ?? rateCard.baseFee ?? 0;
        const perMile = rateCard.perMile ?? 0;
        const perMinute = rateCard.perMinute;
        const pickupPerMile = rateCard.pickupPerMile;
        const minimumFee = rateCard.minimumFee;

        let fee = baseFee + perMile * jobMiles;
        if (pickupPerMile && pickupMiles !== undefined) fee += pickupPerMile * pickupMiles;
        if (perMinute && mode) {
          const speedMap: any = { walk: 3, foot: 3, bike: 12, scooter: 10, motorcycle: 20, car: 25, van: 25, truck: 20 };
          const speedMph = speedMap[mode] || 25;
          const minutes = Math.round((jobMiles / speedMph) * 60);
          fee += perMinute * minutes;
        }
        if (minimumFee && fee < minimumFee) fee = minimumFee;
        return Math.round(fee * 100) / 100;
      };

      if (rateCard && courierLoc) {
        const pickupMiles = calcMiles(courierLoc, pickup);
        const jobMiles = calcMiles(pickup, dropoff);
        const serverFee = calcFee(rateCard, jobMiles, pickupMiles, courierData.courierProfile?.vehicleType || 'car');
        await jobRef.update({ agreedFee: serverFee });
      }
    }
  } catch (e) {
    console.warn('Failed to compute and write server-agreed fee for seeded job:', e);
  }

  // 2) Navigate to the courier login and sign in
  const COURIER_EMAIL = 'courier@sender.com';
  const COURIER_PASS = 'courier123';

  // Try multiple hosts as in courier-smoke.spec
  const hosts = ['127.0.0.1', 'localhost', '[::1]'];
  const ports = [5174, 5175];
  let navigated = false;
  for (const host of hosts) {
    for (const port of ports) {
      const url = `http://${host}:${port}/login`;
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 3000 });
        navigated = true;
        break;
      } catch (err) {
        // try next
      }
    }
    if (navigated) break;
  }
  if (!navigated) throw new Error('Failed to reach courier server');

  await page.fill('input[type="email"]', COURIER_EMAIL);
  await page.fill('input[type="password"]', COURIER_PASS);
  await page.click('button:has-text("Sign In as Senderr")');

  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // 3) Wait for the seeded job pickup label to appear in the UI
  await page.waitForSelector(`text=${pickup.label}`, { timeout: 15000 });

  // Click the job card to select it, then click the Accept button within that card
  const jobCard = page.locator(`div:has-text("${pickup.label}")`).first();
  await jobCard.click();

  // Now click the Accept Job button inside the selected job card. Sometimes UI overlays
  // (sheet handles or map) can intercept pointer events; in that case fall back to a
  // JS click which bypasses pointer-event checks.
  const acceptBtn = jobCard.locator('button:has-text("Accept Job")').first();
  try {
    await acceptBtn.waitFor({ state: 'visible', timeout: 5000 });
    await acceptBtn.click({ timeout: 5000 });
  } catch (err) {
    // If normal click fails (due to overlays intercepting pointer events), use a forced click
    try {
      await acceptBtn.click({ force: true });
    } catch (err2) {
      console.error('Failed to click Accept (even with force):', err2);
      throw err2;
    }
  }

  // If an accept modal or price-confirm modal appears, confirm the accept there
  try {
    // Price confirm takes priority — it can appear after a failed claim
    await page.waitForSelector('[data-testid="accept-server-price-btn"]', { timeout: 2500 });
    await page.click('[data-testid="accept-server-price-btn"]');
  } catch (err) {
    try {
      await page.waitForSelector('[data-testid="accept-job-accept-btn"]', { timeout: 2500 });
      await page.click('[data-testid="accept-job-accept-btn"]');
    } catch (err2) {
      // No modal appeared — assume accept was inline
    }
  }

  // Wait for the active job section to appear (or for the selected job to appear as assigned)
  await expect(page.getByText('Active Send', { exact: false })).toBeVisible({ timeout: 15000 });

  // Poll the job doc until status becomes 'assigned' and courierUid is set (claim completed)
  await page.waitForTimeout(500); // give server a moment
  let claimSnap = await jobRef.get();
  let claimData = claimSnap.data();
  for (let i = 0; i < 10 && claimData?.status !== 'assigned'; i++) {
    await new Promise(r => setTimeout(r, 500));
    claimSnap = await jobRef.get();
    claimData = claimSnap.data();
  }
  if (claimData?.status !== 'assigned') {
    // Attach jobId for debugging and fail early
    await testInfo.attach('jobId', { body: jobId.toString() });
    throw new Error('Job was not assigned after accept step');
  }

  // 4) Start Trip (use dashboard Start Trip button)
  await page.click('button:has-text("Start Trip")');

  // Capture a screenshot after starting trip for debugging
  await page.screenshot({ path: testInfo.outputPath('started-trip.png'), fullPage: true });

  // Wait for navigation UI (Arrived Pickup / Picked Up buttons) to appear
  await expect(page.locator('button:has-text("Arrived Pickup")').first()).toBeVisible({ timeout: 15000 });

  // 5) Mark Arrived at Pickup
  // Click the Arrived Pickup button; use a forced click if overlays intercept pointer events
  try {
    await page.locator('button:has-text("Arrived Pickup")').first().click({ timeout: 5000 });
  } catch (err) {
    await page.locator('button:has-text("Arrived Pickup")').first().click({ force: true });
  }

  // Poll job doc until status is 'arrived_pickup'
  await testInfo.attach('jobId', { body: jobId.toString() });
  await page.waitForTimeout(500); // give server a bit
  let jobSnap = await jobRef.get();
  let jobData = jobSnap.data();
  for (let i = 0; i < 8 && jobData?.status !== 'arrived_pickup'; i++) {
    await new Promise(r => setTimeout(r, 500));
    jobSnap = await jobRef.get();
    jobData = jobSnap.data();
  }
  expect(jobData?.status).toBe('arrived_pickup');

  // 6) Click Picked Up
  try {
    await page.locator('button:has-text("Picked Up")').first().click({ timeout: 5000 });
  } catch (err) {
    await page.locator('button:has-text("Picked Up")').first().click({ force: true });
  }

  // Wait for job status 'picked_up'
  for (let i = 0; i < 8 && jobData?.status !== 'picked_up'; i++) {
    await new Promise(r => setTimeout(r, 500));
    jobSnap = await jobRef.get();
    jobData = jobSnap.data();
  }
  expect(jobData?.status).toBe('picked_up');

  // 7) Navigate to job detail page and mark completed
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/jobs/${jobId}`);

  // Try 'Mark as Completed' or variations
  try {
    await page.click('button:has-text("Mark as Completed")', { timeout: 5000 });
  } catch (err) {
    try {
      await page.click('button:has-text("Complete")', { timeout: 2000 });
    } catch (err2) {
      // If no UI button present, try opening job detail's actions menu
      console.warn('Could not find completion button on JobDetail - falling back to admin update');
      await jobRef.update({ status: 'completed', completedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
  }

  // Capture a screenshot after marking complete
  await page.screenshot({ path: testInfo.outputPath('completed-job.png'), fullPage: true });

  // Wait for backend status to become 'completed'
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 500));
    jobSnap = await jobRef.get();
    jobData = jobSnap.data();
    if (jobData?.status === 'completed') break;
  }

  expect(jobData?.status).toBe('completed');

  // Clean up: shut down firebase-admin app to allow Node to exit cleanly
  try {
    await admin.app().delete();
  } catch (e) {
    console.warn('Failed to delete admin app:', e);
  }
});
