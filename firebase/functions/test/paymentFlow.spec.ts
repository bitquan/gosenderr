import { assert } from 'chai'
import * as admin from 'firebase-admin'

// Import handler directly from source (ts-node/register in mocha ensures TS is runnable)
const { transferPayoutHandler } = require('../src/stripe/transferPayout')

describe('transferPayout trigger', function () {
  before(async function () {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
    process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'

    if (!admin.apps || !admin.apps.length) {
      admin.initializeApp({ projectId: 'gosenderr-6773f' })
    }
  })

  it('should create a payout and update job when courier has stripe account', async function () {
    // create courier user
    const courier = await admin.auth().createUser({ email: `courier+${Date.now()}@example.com`, password: 'password' })
    await admin.firestore().doc(`users/${courier.uid}`).set({ courierProfile: { stripeAccountId: 'acct_test' } })

    // create job doc before state (not confirmed)
    const jobRef = admin.firestore().collection('deliveryJobs').doc()
    const before = {
      paymentStatus: 'captured',
      customerConfirmation: { received: false },
      courierUid: courier.uid,
      pricing: { courierEarnings: 25.0, platformFees: 0.75 }
    }
    await jobRef.set(before)

    // after state: confirmation received
    const after = Object.assign({}, before, { customerConfirmation: { received: true } })

    const change: any = {
      before: { data: () => before },
      after: { data: () => after }
    }

    // stripe mock
    const stripeMock = {
      transfers: {
        create: async (params: any) => ({ id: `tr_${Date.now()}`, amount: params.amount, status: 'paid' })
      }
    }

    const context: any = { params: { jobId: jobRef.id } }

    try {
      const result = await transferPayoutHandler(change, context, stripeMock)
      assert.ok(result && result.success)

      const jobDoc = await admin.firestore().doc(`deliveryJobs/${jobRef.id}`).get()
      const jobData = jobDoc.data()
      assert.equal(jobData?.payout?.status, 'completed')

      const payoutsSnap = await admin.firestore().collection('payouts').where('jobId', '==', jobRef.id).get()
      assert.equal(payoutsSnap.size, 1)
      const p = payoutsSnap.docs[0].data()
      assert.equal(p.amount, 25.0)
      assert.equal(p.status, 'completed')
    } finally {
      // cleanup
      try { await admin.firestore().doc(`deliveryJobs/${jobRef.id}`).delete() } catch (e) {}
      try { const ps = await admin.firestore().collection('payouts').where('jobId', '==', jobRef.id).get(); for (const d of ps.docs) await admin.firestore().doc(d.ref.path).delete() } catch (e) {}
      try { await admin.auth().deleteUser(courier.uid) } catch (e) {}
      try { await admin.firestore().doc(`users/${courier.uid}`).delete() } catch (e) {}
    }
  })

  it('should mark payout pending_setup when courier missing stripe account', async function () {
    const courier = await admin.auth().createUser({ email: `nocourier+${Date.now()}@example.com`, password: 'password' })
    await admin.firestore().doc(`users/${courier.uid}`).set({})

    const jobRef = admin.firestore().collection('deliveryJobs').doc()
    const before = { paymentStatus: 'captured', customerConfirmation: { received: false }, courierUid: courier.uid }
    await jobRef.set(before)

    const after = Object.assign({}, before, { customerConfirmation: { received: true } })
    const change: any = { before: { data: () => before }, after: { data: () => after } }
    const context: any = { params: { jobId: jobRef.id } }

    try {
      const result = await transferPayoutHandler(change, context, undefined)
      assert.ok(result && result.reason === 'missing_stripe_account')

      const jobDoc = await admin.firestore().doc(`deliveryJobs/${jobRef.id}`).get()
      const jobData = jobDoc.data()
      assert.equal(jobData?.payout?.status, 'pending_setup')

      const payoutsSnap = await admin.firestore().collection('payouts').where('jobId', '==', jobRef.id).get()
      assert.equal(payoutsSnap.size, 1)
      const p = payoutsSnap.docs[0].data()
      assert.equal(p.status, 'pending_setup')
    } finally {
      try { await admin.firestore().doc(`deliveryJobs/${jobRef.id}`).delete() } catch (e) {}
      try { const ps = await admin.firestore().collection('payouts').where('jobId', '==', jobRef.id).get(); for (const d of ps.docs) await admin.firestore().doc(d.ref.path).delete() } catch (e) {}
      try { await admin.auth().deleteUser(courier.uid) } catch (e) {}
      try { await admin.firestore().doc(`users/${courier.uid}`).delete() } catch (e) {}
    }
  })
})
