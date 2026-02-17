const assert = require('assert').strict
const fetch = require('node-fetch')
const admin = require('firebase-admin')

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

describe('token wallet idempotency (admin adjust) - emulator', function () {
  before(async function () {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
    process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'

    const appName = `testTokenWallet-${Date.now()}`
    const testApp = admin.initializeApp({ projectId: 'gosenderr-6773f' }, appName)
    const authClient = admin.auth(testApp)
    const db = admin.firestore(testApp)

    ;(global as any)._testAuthClient = authClient
    ;(global as any)._testDb = db
  })

  it('adjustTokenWalletBalance should be idempotent when called with same idempotencyKey', async function () {
    const authClient: any = (global as any)._testAuthClient
    const db: any = (global as any)._testDb

    const adminUser = await authClient.createUser({ email: `admin+${Date.now()}@example.com`, password: 'password' })
    await db.doc(`users/${adminUser.uid}`).set({ role: 'admin' })

    const target = await authClient.createUser({ email: `target+${Date.now()}@example.com`, password: 'password' })
    await db.doc(`users/${target.uid}`).set({ tokenWallet: { balance: 0, currency: 'TOKENS' } })

    const customToken = await authClient.createCustomToken(adminUser.uid)
    const idToken = await getIdToken(customToken)

    try {
      const idemKey = 'adm-idem-xyz-1'

      // first call - apply +100
      let res = await callCallable('adjustTokenWalletBalance', idToken, { targetUid: target.uid, delta: 100, reason: 'test_topup', idempotencyKey: idemKey })
      if (res.status !== 200) {
        const body = await res.text()
        console.error('adjustTokenWalletBalance (first) error body:', body)
      }
      assert.equal(res.status, 200, 'adjustTokenWalletBalance first call should return 200')
      let json = await res.json()
      assert.equal(json.result.targetUid, target.uid)
      assert.equal(json.result.balance, 100)

      // replay with same idempotencyKey - should be idempotent / duplicate
      res = await callCallable('adjustTokenWalletBalance', idToken, { targetUid: target.uid, delta: 100, reason: 'test_topup', idempotencyKey: idemKey })
      assert.equal(res.status, 200, 'adjustTokenWalletBalance replay should return 200')
      json = await res.json()
      assert.ok(json.result && (json.result.duplicate === true || json.result.balance === 100), 'replayed adjustTokenWalletBalance should be idempotent')

      // verify single ledger entry exists with delta 100
      const ledgerSnapshot = await db.collection('users').doc(target.uid).collection('tokenWalletLedger').where('delta', '==', 100).get()
      assert.equal(ledgerSnapshot.size, 1)

    } finally {
      try { await authClient.deleteUser(adminUser.uid) } catch (e) {}
      try { await db.doc(`users/${adminUser.uid}`).delete() } catch (e) {}
      try { await authClient.deleteUser(target.uid) } catch (e) {}
      try { await db.doc(`users/${target.uid}`).delete() } catch (e) {}
    }
  })
})
