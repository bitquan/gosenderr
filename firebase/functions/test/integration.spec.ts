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
    const email = `new-user+${Date.now()}@example.com`
    try {
      const result = await require('../lib/http/createUserForAdmin').createUserForAdminHandler({ email, password: 'secret123', role: 'customer', displayName: 'Test User' }, context)
      assert.ok(result && result.uid, 'expected result.uid')
      const uid = result.uid
      // verify user document exists
      const doc = await admin.firestore().doc(`users/${uid}`).get()
      assert.ok(doc.exists, 'User document should exist')
      const data = doc.data()
      assert.equal(data?.email, email.toLowerCase())
    } catch (err: any) {
      console.error('createUserForAdmin handler error:', err && err.stack ? err.stack : err)
      throw err
    }


  })

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
    try {
      const result = await require('../lib/http/runTestFlow').runTestFlowHandler({ targetUserId: targetUser.uid, cleanup: true }, context)
      assert.ok(result.runLogId, 'runLogId should be returned')

      // wait a moment for entries to be written
      await new Promise(r => setTimeout(r, 500))

      const entriesSnap = await admin.firestore().collection(`adminFlowLogs/${result.runLogId}/entries`).get()
      assert.ok(entriesSnap.size > 0, 'Expected at least one run log entry')
    } catch (err: any) {
      console.error('runTestFlow handler error:', err && err.stack ? err.stack : err)
      throw err
    }
  })
})
