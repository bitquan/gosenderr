import admin from 'firebase-admin';

const projectId = 'gosenderr-6773f';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();
const apiBase = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const callableBase = `http://127.0.0.1:5001/${projectId}/us-central1`;

async function signUpOrSignIn(email, password) {
  const signUpRes = await fetch(`${apiBase}/accounts:signUp?key=fake-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  if (signUpRes.ok) {
    return signUpRes.json();
  }

  const signInRes = await fetch(`${apiBase}/accounts:signInWithPassword?key=fake-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  if (!signInRes.ok) {
    const errText = await signInRes.text();
    throw new Error(`Auth failed for ${email}: ${errText}`);
  }

  return signInRes.json();
}

async function callCallable(name, idToken, data) {
  const response = await fetch(`${callableBase}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ data }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) {
    const message = payload?.error?.message || response.statusText;
    throw new Error(`${name} failed: ${message}`);
  }

  return payload.result;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const customer = await signUpOrSignIn('smoke.customer@gosenderr.test', 'DemoPass123!');
  const courier = await signUpOrSignIn('smoke.courier@gosenderr.test', 'DemoPass123!');

  await db.doc('platformSettings/tokenPolicy').set({
    enabled: true,
    finalSale: true,
    tokenValueUsd: 1,
    costs: {
      jobUnlockStandard: 1,
      jobUnlockPriority: 2,
      jobUnlockHeavy: 3,
      listingPublish: 2,
      cashFee: 1,
      adBoost24h: 5,
      adBoost7d: 25,
      adBoost30d: 80,
      adFeatured7d: 120,
    },
    packs: [{ id: 'starter_10', tokens: 10, priceUsd: 10 }],
  }, { merge: true });

  await db.doc(`users/${customer.localId}`).set({
    role: 'customer',
    email: 'smoke.customer@gosenderr.test',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  await db.doc(`users/${courier.localId}`).set({
    role: 'courier',
    email: 'smoke.courier@gosenderr.test',
    courierProfile: {
      status: 'approved',
      payoutMode: 'token',
      isOnline: true,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  await db.doc(`tokenWallets/${courier.localId}`).set({
    available: 5,
    reserved: 0,
    lifetimePurchased: 5,
    lifetimeSpent: 0,
    lifetimeAdjusted: 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  const job1Ref = db.collection('jobs').doc();
  await job1Ref.set({
    createdByUid: customer.localId,
    courierUid: null,
    agreedFee: null,
    status: 'open',
    pickup: { lat: 37.78, lng: -122.4, label: 'Pickup A' },
    dropoff: { lat: 37.79, lng: -122.41, label: 'Dropoff A' },
    package: { size: 'small', notes: 'Smoke test job 1' },
    photos: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const reserve1 = `smoke_reserve_${job1Ref.id}_${courier.localId}`;
  await callCallable('tokenReserve', courier.idToken, {
    action: 'jobUnlockStandard',
    amount: 1,
    idempotencyKey: reserve1,
    metadata: { jobId: job1Ref.id, courierUid: courier.localId },
  });
  await callCallable('claimCourierJob', courier.idToken, { jobId: job1Ref.id, agreedFee: 10 });
  await callCallable('tokenCommit', courier.idToken, {
    reservationId: reserve1,
    idempotencyKey: `smoke_commit_${job1Ref.id}_${courier.localId}`,
    metadata: { jobId: job1Ref.id, courierUid: courier.localId },
  });

  await callCallable('cancelCourierJob', customer.idToken, { jobId: job1Ref.id });

  const walletAfterCancel = (await db.doc(`tokenWallets/${courier.localId}`).get()).data() || {};
  assert(Number(walletAfterCancel.available) === 5, `Expected available=5 after cancel refund, got ${walletAfterCancel.available}`);
  const cancelRefundTx = await db.doc(`tokenTransactions/auto_refund_job_cancelled_${job1Ref.id}`).get();
  assert(cancelRefundTx.exists, 'Expected auto cancel refund transaction');

  const job2Ref = db.collection('jobs').doc();
  await job2Ref.set({
    createdByUid: customer.localId,
    courierUid: null,
    agreedFee: null,
    status: 'open',
    pickup: { lat: 37.78, lng: -122.4, label: 'Pickup B' },
    dropoff: { lat: 37.79, lng: -122.41, label: 'Dropoff B' },
    package: { size: 'small', notes: 'Smoke test job 2' },
    photos: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const reserve2 = `smoke_reserve_${job2Ref.id}_${courier.localId}`;
  await callCallable('tokenReserve', courier.idToken, {
    action: 'jobUnlockStandard',
    amount: 1,
    idempotencyKey: reserve2,
    metadata: { jobId: job2Ref.id, courierUid: courier.localId },
  });
  await callCallable('claimCourierJob', courier.idToken, { jobId: job2Ref.id, agreedFee: 12 });
  await callCallable('tokenCommit', courier.idToken, {
    reservationId: reserve2,
    idempotencyKey: `smoke_commit_${job2Ref.id}_${courier.localId}`,
    metadata: { jobId: job2Ref.id, courierUid: courier.localId },
  });

  await job2Ref.update({
    status: 'completed',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await callCallable('submitCourierJobDispute', customer.idToken, {
    jobId: job2Ref.id,
    reason: 'Item not delivered',
    description: 'Customer reported a missing dropoff and requested investigation.',
  });

  const walletAfterDispute = (await db.doc(`tokenWallets/${courier.localId}`).get()).data() || {};
  assert(Number(walletAfterDispute.available) === 5, `Expected available=5 after dispute refund, got ${walletAfterDispute.available}`);
  const disputeRefundTx = await db.doc(`tokenTransactions/auto_refund_job_disputed_${job2Ref.id}`).get();
  assert(disputeRefundTx.exists, 'Expected auto dispute refund transaction');

  let checkoutStatus = 'not-run';
  try {
    await callCallable('tokenCreateCheckoutSession', courier.idToken, {
      packId: 'starter_10',
      successUrl: 'http://localhost:5174/settings?tokenTopup=success',
      cancelUrl: 'http://localhost:5174/settings?tokenTopup=cancel',
      idempotencyKey: `smoke_checkout_${Date.now()}`,
    });
    checkoutStatus = 'ok';
  } catch (error) {
    checkoutStatus = `blocked (${error.message})`;
  }

  console.log('✅ Token smoke summary');
  console.log(JSON.stringify({
    customerUid: customer.localId,
    courierUid: courier.localId,
    cancelRefund: 'ok',
    disputeRefund: 'ok',
    checkoutSession: checkoutStatus,
  }, null, 2));
}

main().catch((error) => {
  console.error('❌ Token smoke failed:', error.message || error);
  process.exit(1);
});
