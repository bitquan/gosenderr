const assert = require('assert').strict
const fetch = require('node-fetch')
const admin = require('firebase-admin')

// Helpers from integration harness
async function getIdToken(customToken) {
  const url = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=anything`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  })
  const json = await res.json()
  if (!json.idToken) throw new Error('Failed to get idToken from emulator: ' + JSON.stringify(json))
  return json.idToken
}

async function callCallable(fnName, idToken, data) {
  const url = `http://127.0.0.1:5001/gosenderr-6773f/us-central1/${fnName}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ data })
  })
  return res
}

describe('lifecycle callables - full smoke (emulator)', function () {
  before(async function () {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
    process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'

    // create a dedicated admin app for this test to guarantee projectId is present
    const appName = `testLifecycle-${Date.now()}`
    const testApp = admin.initializeApp({ projectId: 'gosenderr-6773f' }, appName)
    const authClient = admin.auth(testApp)
    const db = admin.firestore(testApp)

    // ensure emulator UI available
    const ok = await fetch('http://127.0.0.1:4000')
    if (!ok) throw new Error('Emulator UI not available on :4000, ensure emulators are running')

    // attach test-scoped clients to global for use in tests
    ;(global as any)._testAuthClient = authClient
    ;(global as any)._testDb = db
  })

  it('claim -> enroute_pickup -> arrived_pickup -> picked_up -> enroute_dropoff -> arrived_dropoff -> completed', async function () {
    // create customer (job creator)
    const authClient: any = (global as any)._testAuthClient
    const db: any = (global as any)._testDb

    const customer = await authClient.createUser({ email: `cust+${Date.now()}@example.com`, password: 'password' })
    await db.doc(`users/${customer.uid}`).set({ role: 'customer' })

    // create courier with required profile (currentLocation + packageRateCard)
    const courier = await authClient.createUser({ email: `courier+${Date.now()}@example.com`, password: 'password' })
    await db.doc(`users/${courier.uid}`).set({ courierProfile: { currentLocation: { lat: 37.7749, lng: -122.4194 }, packageRateCard: { base: 5 } } })

    // create open job
    const jobRef = db.collection('jobs').doc()
    const jobPayload = {
      createdByUid: customer.uid,
      status: 'open',
      pickup: { lat: 37.7749, lng: -122.4194 },
      dropoff: { lat: 37.7750, lng: -122.4180 },
      courierUid: null,
      agreedFee: null,
      isFoodItem: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
    await jobRef.set(jobPayload)

    // courier caller auth
    const customToken = await authClient.createCustomToken(courier.uid)
    const idToken = await getIdToken(customToken)

    try {
      // Claim job via callable
      let res = await callCallable('claimJob', idToken, { jobId: jobRef.id, agreedFee: 12.5 })
      if (res.status !== 200) {
        const errBody = await res.text()
        console.error('claimJob callable error body:', errBody)
      }
      assert.equal(res.status, 200, 'claimJob callable should return 200')
      let json = await res.json()
      assert.ok(json.result && json.result.ok === true, 'claimJob should return ok')

      // verify job assigned
      let jobDoc = await db.doc(`jobs/${jobRef.id}`).get()
      assert.equal(jobDoc.data().status, 'assigned')
      assert.equal(jobDoc.data().courierUid, courier.uid)

      // idempotency: advance one step with an idempotencyKey then replay same key
      const idemKey = 'test-idem-1234'
      res = await callCallable('updateJobStatus', idToken, { jobId: jobRef.id, nextStatus: 'enroute_pickup', idempotencyKey: idemKey })
      assert.equal(res.status, 200, 'updateJobStatus (first with idempotencyKey) should return 200')
      json = await res.json()
      assert.ok(json.result && json.result.ok === true, 'first updateJobStatus with idempotencyKey should return ok')

      // inspect job state immediately after first call
      jobDoc = await db.doc(`jobs/${jobRef.id}`).get()
      console.log('DEBUG: job status after first idem call =', jobDoc.data().status)

      // ensure idempotency record exists
      const idemDoc = await db.doc(`idempotency/${courier.uid}:${idemKey}`).get()
      console.log('DEBUG: idempotency doc exists?', idemDoc.exists)

      // replay with same idem: should be idempotent / return duplicate
      res = await callCallable('updateJobStatus', idToken, { jobId: jobRef.id, nextStatus: 'enroute_pickup', idempotencyKey: idemKey })
      if (res.status !== 200) {
        const body = await res.text()
        console.error('updateJobStatus (replay with idem) error body:', body)
      }
      assert.equal(res.status, 200, 'updateJobStatus (replay with idem) should return 200')
      json = await res.json()
      assert.ok(json.result && (json.result.duplicate === true || json.result.ok === true), 'replayed updateJobStatus should be idempotent')

      jobDoc = await db.doc(`jobs/${jobRef.id}`).get()
      assert.equal(jobDoc.data().status, 'enroute_pickup')

      // progression sequence
      const seq = ['arrived_pickup','picked_up','enroute_dropoff','arrived_dropoff','completed']
      for (const next of seq) {
        res = await callCallable('updateJobStatus', idToken, { jobId: jobRef.id, nextStatus: next })
        assert.equal(res.status, 200, `updateJobStatus(${next}) callable should return 200`)
        json = await res.json()
        assert.ok(json.result && json.result.ok === true, `updateJobStatus(${next}) should return ok`)

        jobDoc = await db.doc(`jobs/${jobRef.id}`).get()
        assert.equal(jobDoc.data().status, next)
      }


    } finally {
      // cleanup
      try { await db.doc(`jobs/${jobRef.id}`).delete() } catch (e) {}
      try { await authClient.deleteUser(customer.uid) } catch (e) {}
      try { await db.doc(`users/${customer.uid}`).delete() } catch (e) {}
      try { await authClient.deleteUser(courier.uid) } catch (e) {}
      try { await db.doc(`users/${courier.uid}`).delete() } catch (e) {}
    }
  })
})
