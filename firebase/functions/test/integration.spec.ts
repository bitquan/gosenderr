const assert = require('assert').strict
const fetch = require('node-fetch')
const admin = require('firebase-admin')

// Helper to exchange custom token for ID token from the Auth emulator
async function getIdToken(customToken: string) {
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

// Helper to call callable function endpoint on the local functions emulator
async function callCallable(fnName: string, idToken: string, data: any) {
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

describe('Cloud Functions integration tests (emulator)', function () {
  before(async function () {
    // Ensure we talk to emulators
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
    process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'

    if (!admin.apps || !admin.apps.length) {
      admin.initializeApp({ projectId: 'gosenderr-6773f' })
    }

    // quick smoke: ensure emulator endpoints respond
    // (will throw if they aren't running)
    const ok = await fetch('http://127.0.0.1:4000')
    // Note: We're just touching the emulator UI; it's okay if 200/302
    if (!ok) throw new Error('Emulator UI not available on :4000, ensure emulators are running')
  })

  it('createUserForAdmin should create an auth user and firestore user', async function () {
    // Create an admin caller
    const adminUser = await admin.auth().createUser({ email: `test-admin+${Date.now()}@example.com`, password: 'password123' })
    await admin.firestore().doc(`users/${adminUser.uid}`).set({ role: 'admin' })

    // For better visibility in tests, call the handler directly to get a stack trace when it errors
    const context: any = { auth: { uid: adminUser.uid } }
    const emailCallable = `new-user+callable+${Date.now()}+${Math.random().toString(36).slice(2,8)}@example.com`
    const emailHandler = `new-user+handler+${Date.now()}+${Math.random().toString(36).slice(2,8)}@example.com`

    // Track created users for cleanup
    const createdUids: string[] = []

    // Also exercise the callable endpoint (as the browser would) to ensure callable plumbing works
    const customToken = await admin.auth().createCustomToken(adminUser.uid)
    const idToken = await getIdToken(customToken)

    const res = await callCallable('createUserForAdmin', idToken, { email: emailCallable, password: 'secret123', role: 'customer', displayName: 'Test User' })
    const json = await res.json()
    if (res.status !== 200) console.error('createUserForAdmin callable error response:', JSON.stringify(json, null, 2))
    assert.equal(res.status, 200, 'createUserForAdmin callable should return 200')
    // record uid if returned
    if (json && json.uid) createdUids.push(json.uid)

    // verify using handler as well (use a different email to avoid collision)
    try {
      const result = await require('../lib/http/createUserForAdmin').createUserForAdminHandler({ email: emailHandler, password: 'secret123', role: 'customer', displayName: 'Test User' }, context)
      assert.ok(result && result.uid, 'expected result.uid')
      const uid = result.uid
      createdUids.push(uid)
      // verify user document exists
      const doc = await admin.firestore().doc(`users/${uid}`).get()
      assert.ok(doc.exists, 'User document should exist')
      const data = doc.data()
      assert.equal(data?.email, emailHandler.toLowerCase())
    } catch (err: any) {
      console.error('createUserForAdmin handler error:', err && err.stack ? err.stack : err)
      throw err
    } finally {
      // cleanup created users and docs
      for (const uid of createdUids) {
        try {
          await admin.auth().deleteUser(uid)
        } catch (e) {
          // ignore
        }
        try {
          await admin.firestore().doc(`users/${uid}`).delete()
        } catch (e) {
          // ignore
        }
      }
      // cleanup adminUser
      try { await admin.auth().deleteUser(adminUser.uid) } catch (e) {}
      try { await admin.firestore().doc(`users/${adminUser.uid}`).delete() } catch (e) {}
    }

  } )

  it('runTestFlow should create a run log and entries', async function () {
    // Create an admin caller
    const adminUser = await admin.auth().createUser({ email: `test-admin2+${Date.now()}@example.com`, password: 'password123' })
    await admin.firestore().doc(`users/${adminUser.uid}`).set({ role: 'admin' })

    const targetUser = await admin.auth().createUser({ email: `target-user+${Date.now()}@example.com`, password: 'password123' })
    await admin.firestore().doc(`users/${targetUser.uid}`).set({ role: 'customer' })

    const customToken = await admin.auth().createCustomToken(adminUser.uid)
    const idToken = await getIdToken(customToken)

    // Call handler directly (avoid callable auth complexity in test)
    const context: any = { auth: { uid: adminUser.uid } }
    let runLogId: string | undefined
    try {
      const result = await require('../lib/http/runTestFlow').runTestFlowHandler({ targetUserId: targetUser.uid, cleanup: true }, context)
      assert.ok(result.runLogId, 'runLogId should be returned')
      runLogId = result.runLogId

      // wait a moment for entries to be written
      await new Promise(r => setTimeout(r, 500))

      const entriesSnap = await admin.firestore().collection(`adminFlowLogs/${result.runLogId}/entries`).get()
      assert.ok(entriesSnap.size > 0, 'Expected at least one run log entry')
    } catch (err: any) {
      console.error('runTestFlow handler error:', err && err.stack ? err.stack : err)
      throw err
    } finally {
      // cleanup target/admin users and docs
      try { await admin.auth().deleteUser(targetUser.uid) } catch (e) {}
      try { await admin.firestore().doc(`users/${targetUser.uid}`).delete() } catch (e) {}
      try { await admin.auth().deleteUser(adminUser.uid) } catch (e) {}
      try { await admin.firestore().doc(`users/${adminUser.uid}`).delete() } catch (e) {}

      // cleanup run log and entries
      if (runLogId) {
        try {
          const entries = await admin.firestore().collection(`adminFlowLogs/${runLogId}/entries`).listDocuments()
          for (const d of entries) await d.delete()
          await admin.firestore().doc(`adminFlowLogs/${runLogId}`).delete()
        } catch (e) {}
      }
    }
  })

  it('simulateRule callable should exercise Firestore emulator with simulated auth', async function () {
    // Create an admin caller
    const adminUser = await admin.auth().createUser({ email: `rs-admin+${Date.now()}@example.com`, password: 'password123' })
    await admin.firestore().doc(`users/${adminUser.uid}`).set({
      role: 'admin',
      roles: ['admin'],
      activeRole: 'admin',
    })

    // create a test run log specifically for this test
    const runDocRef = admin.firestore().collection('adminFlowLogs').doc(`test-${Date.now()}-${Math.random().toString(36).slice(2,6)}`)
    await runDocRef.set({ adminId: adminUser.uid, targetUserId: 'sim-target', startedAt: admin.firestore.Timestamp.now(), status: 'ok' })
    const runPath = `adminFlowLogs/${runDocRef.id}`

    // run simulateRule as non-admin user (should be denied)
    const targetUid = `sim-user-${Date.now()}`

    const customToken = await admin.auth().createCustomToken(adminUser.uid)
    const idToken = await getIdToken(customToken)

    const res = await callCallable('simulateRule', idToken, { op: 'get', path: runPath, auth: { uid: targetUid } })
    const json = await res.json()
    console.log('simulateRule response (non-admin):', JSON.stringify(json, null, 2))
    // callable should respond and not 500
    assert.equal(res.status, 200, 'simulateRule callable should return 200')
    assert.strictEqual(json?.result?.allowed, false, 'non-admin should be denied reading adminFlowLogs entry')

    // Now check admin access is allowed
    const resAdmin = await callCallable('simulateRule', idToken, { op: 'get', path: runPath, auth: { uid: adminUser.uid } })
    const jsonAdmin = await resAdmin.json()
    console.log('simulateRule admin response:', JSON.stringify(jsonAdmin, null, 2))
    assert.equal(resAdmin.status, 200, 'simulateRule callable should return 200 for admin')
    assert.strictEqual(jsonAdmin?.result?.allowed, true, 'admin should be allowed to read the run log')

    // cleanup
    try { await admin.auth().deleteUser(adminUser.uid) } catch (e) {}
    try { await admin.firestore().doc(`users/${adminUser.uid}`).delete() } catch (e) {}
    try { await admin.firestore().doc('simulateTest/doc1').delete() } catch (e) {}
  })

  it('runSystemSimulation should orchestrate a multi-step system run and cleanup', async function () {
    // create admin caller
    const adminUser = await admin.auth().createUser({ email: `sim-admin+${Date.now()}@example.com`, password: 'password123' })
    await admin.firestore().doc(`users/${adminUser.uid}`).set({ role: 'admin' })

    const context: any = { auth: { uid: adminUser.uid } }

    // Call handler directly to get stack traces on failure
    const result = await require('../lib/http/runSystemSimulation').runSystemSimulationHandler({ intensity: 1, cleanup: true }, context)
    assert.ok(result && result.runLogId, 'Expected runLogId')

    // Give some time for entries to be written
    await new Promise(r => setTimeout(r, 500))

    const entriesSnap = await admin.firestore().collection(`adminFlowLogs/${result.runLogId}/entries`).get()
    assert.ok(entriesSnap.size > 0, 'Expected entries for system simulation')

    // Ensure run doc finished successfully
    const runDoc = await admin.firestore().doc(`adminFlowLogs/${result.runLogId}`).get()
    assert.equal(runDoc.data()?.status, 'complete')

    // cleanup admin user
    try { await admin.auth().deleteUser(adminUser.uid) } catch (e) {}
    try { await admin.firestore().doc(`users/${adminUser.uid}`).delete() } catch (e) {}

    // remove run log and entries
    try {
      const entries = await admin.firestore().collection(`adminFlowLogs/${result.runLogId}/entries`).listDocuments()
      for (const d of entries) await d.delete()
      await admin.firestore().doc(`adminFlowLogs/${result.runLogId}`).delete()
    } catch (e) {}
  })
})
