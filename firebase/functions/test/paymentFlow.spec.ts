import { assert } from 'chai'
import * as admin from 'firebase-admin'

// Import handler directly from source
import { transferPayoutHandler } from '../src/stripe/transferPayout'

async function setCourierNonStripeFlag(enabled: boolean) {
  await admin
    .firestore()
    .doc('featureFlags/config')
    .set(
      {
        payments: {
          senderrplaceNonStripeCourierPayouts: enabled,
        },
      },
      { merge: true }
    )
}

describe('transferPayout trigger', function () {
  before(async function () {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
    process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'

    if (!admin.apps || !admin.apps.length) {
      admin.initializeApp({ projectId: 'gosenderr-6773f' })
    }
  })

  it('should create a payout and update job when courier has stripe account', async function () {
    await setCourierNonStripeFlag(false)

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
    await setCourierNonStripeFlag(false)

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

  it('should mark payout failed when transfer throws an error', async function () {
    await setCourierNonStripeFlag(false)

    const courier = await admin.auth().createUser({ email: `failcourier+${Date.now()}@example.com`, password: 'password' })
    await admin.firestore().doc(`users/${courier.uid}`).set({ courierProfile: { stripeAccountId: 'acct_fail' } })

    const jobRef = admin.firestore().collection('deliveryJobs').doc()
    const before = { paymentStatus: 'captured', customerConfirmation: { received: false }, courierUid: courier.uid, pricing: { courierEarnings: 30.0 } }
    await jobRef.set(before)

    const after = Object.assign({}, before, { customerConfirmation: { received: true } })
    const change: any = { before: { data: () => before }, after: { data: () => after } }
    const context: any = { params: { jobId: jobRef.id } }

    // Stripe mock that throws
    const stripeMock = { transfers: { create: async () => { throw new Error('insufficient_funds') } } }

    try {
      const result = await transferPayoutHandler(change, context, stripeMock)
      assert.ok(result && result.success === false)

      const jobDoc = await admin.firestore().doc(`deliveryJobs/${jobRef.id}`).get()
      const jobData = jobDoc.data()
      assert.equal(jobData?.payout?.status, 'failed')
      assert.ok(jobData?.payout?.errorMessage)

      const payoutsSnap = await admin.firestore().collection('payouts').where('jobId', '==', jobRef.id).get()
      assert.equal(payoutsSnap.size, 1)
      const p = payoutsSnap.docs[0].data()
      assert.equal(p.status, 'failed')
      assert.ok(p.errorMessage)
    } finally {
      try { await admin.firestore().doc(`deliveryJobs/${jobRef.id}`).delete() } catch (e) {}
      try { const ps = await admin.firestore().collection('payouts').where('jobId', '==', jobRef.id).get(); for (const d of ps.docs) await admin.firestore().doc(d.ref.path).delete() } catch (e) {}
      try { await admin.auth().deleteUser(courier.uid) } catch (e) {}
      try { await admin.firestore().doc(`users/${courier.uid}`).delete() } catch (e) {}
    }
  })

  it('should be idempotent and do nothing if payout already completed', async function () {
    await setCourierNonStripeFlag(false)

    const courier = await admin.auth().createUser({ email: `idemp+${Date.now()}@example.com`, password: 'password' })
    await admin.firestore().doc(`users/${courier.uid}`).set({ courierProfile: { stripeAccountId: 'acct_test' } })

    const jobRef = admin.firestore().collection('deliveryJobs').doc()
    const before = { paymentStatus: 'captured', customerConfirmation: { received: false }, courierUid: courier.uid }
    // Simulate already completed payout
    const after = Object.assign({}, before, { customerConfirmation: { received: true }, payout: { status: 'completed', transferId: 'tr_existing' } })
    await jobRef.set(after)

    const change: any = { before: { data: () => before }, after: { data: () => after } }
    const context: any = { params: { jobId: jobRef.id } }

    try {
      const result = await transferPayoutHandler(change, context, { transfers: { create: async () => ({ id: 'tr_new', amount: 1000 }) } })
      // Handler should have exited early and returned null
      assert.equal(result, null)

      const payoutsSnap = await admin.firestore().collection('payouts').where('jobId', '==', jobRef.id).get()
      assert.equal(payoutsSnap.size, 0)
    } finally {
      try { await admin.firestore().doc(`deliveryJobs/${jobRef.id}`).delete() } catch (e) {}
      try { await admin.auth().deleteUser(courier.uid) } catch (e) {}
      try { await admin.firestore().doc(`users/${courier.uid}`).delete() } catch (e) {}
    }
  })

  it('should defer payout when courier uses external provider and flag is enabled', async function () {
    await setCourierNonStripeFlag(true)

    const courier = await admin.auth().createUser({ email: `external+${Date.now()}@example.com`, password: 'password' })
    await admin
      .firestore()
      .doc(`users/${courier.uid}`)
      .set({ courierProfile: { payoutMode: 'external_provider', externalPayoutProvider: 'paypal' } })

    const jobRef = admin.firestore().collection('deliveryJobs').doc()
    const before = {
      paymentStatus: 'captured',
      customerConfirmation: { received: false },
      courierUid: courier.uid,
      pricing: { courierEarnings: 45.25, platformFees: 4.75 },
    }
    await jobRef.set(before)

    const after = Object.assign({}, before, { customerConfirmation: { received: true } })
    const change: any = { before: { data: () => before }, after: { data: () => after } }
    const context: any = { params: { jobId: jobRef.id } }

    const stripeMock = {
      transfers: {
        create: async () => {
          throw new Error('stripe_transfer_should_not_be_called')
        },
      },
    }

    try {
      const result = await transferPayoutHandler(change, context, stripeMock)
      assert.ok(result && result.success === true)
      assert.equal(result?.deferred, true)
      assert.equal(result?.payoutMode, 'external_provider')

      const jobDoc = await admin.firestore().doc(`deliveryJobs/${jobRef.id}`).get()
      const jobData = jobDoc.data()
      assert.equal(jobData?.payout?.status, 'deferred_non_stripe')
      assert.equal(jobData?.courier_earnings_status, 'deferred_non_stripe')
      assert.equal(jobData?.courier_platform_fee_status, 'captured')

      const payoutsSnap = await admin.firestore().collection('payouts').where('jobId', '==', jobRef.id).get()
      assert.equal(payoutsSnap.size, 1)
      const payout = payoutsSnap.docs[0].data()
      assert.equal(payout.status, 'deferred_non_stripe')
      assert.equal(payout.payoutMode, 'external_provider')
      assert.equal(payout.platformFeeStatus, 'captured')
      assert.equal(payout.platformFeeAmount, 4.75)
    } finally {
      try { await admin.firestore().doc(`deliveryJobs/${jobRef.id}`).delete() } catch (e) {}
      try { const ps = await admin.firestore().collection('payouts').where('jobId', '==', jobRef.id).get(); for (const d of ps.docs) await admin.firestore().doc(d.ref.path).delete() } catch (e) {}
      try { await admin.auth().deleteUser(courier.uid) } catch (e) {}
      try { await admin.firestore().doc(`users/${courier.uid}`).delete() } catch (e) {}
    }
  })

  it('should fallback to stripe when courier mode is non-stripe but feature flag is disabled', async function () {
    await setCourierNonStripeFlag(false)

    const courier = await admin.auth().createUser({ email: `fallback+${Date.now()}@example.com`, password: 'password' })
    await admin
      .firestore()
      .doc(`users/${courier.uid}`)
      .set({ courierProfile: { payoutMode: 'manual_settlement', stripeAccountId: 'acct_test_fallback' } })

    const jobRef = admin.firestore().collection('deliveryJobs').doc()
    const before = {
      paymentStatus: 'captured',
      customerConfirmation: { received: false },
      courierUid: courier.uid,
      pricing: { courierEarnings: 18.5, platformFee: 2.5 },
    }
    await jobRef.set(before)

    const after = Object.assign({}, before, { customerConfirmation: { received: true } })
    const change: any = { before: { data: () => before }, after: { data: () => after } }
    const context: any = { params: { jobId: jobRef.id } }

    const stripeMock = {
      transfers: {
        create: async (params: any) => ({ id: `tr_${Date.now()}`, amount: params.amount, status: 'paid' }),
      },
    }

    try {
      const result = await transferPayoutHandler(change, context, stripeMock)
      assert.ok(result && result.success)
      assert.equal(result?.payoutMode, 'stripe_connect')
      assert.equal(result?.payoutExecution, 'stripe_connect_fallback')

      const jobDoc = await admin.firestore().doc(`deliveryJobs/${jobRef.id}`).get()
      const jobData = jobDoc.data()
      assert.equal(jobData?.payout?.status, 'completed')
      assert.equal(jobData?.payout?.mode, 'stripe_connect')
      assert.equal(jobData?.payout?.execution, 'stripe_connect_fallback')
      assert.equal(jobData?.courier_platform_fee_status, 'captured')

      const payoutsSnap = await admin.firestore().collection('payouts').where('jobId', '==', jobRef.id).get()
      assert.equal(payoutsSnap.size, 1)
      const payout = payoutsSnap.docs[0].data()
      assert.equal(payout.status, 'completed')
      assert.equal(payout.payoutMode, 'stripe_connect')
      assert.equal(payout.payoutExecution, 'stripe_connect_fallback')
    } finally {
      try { await admin.firestore().doc(`deliveryJobs/${jobRef.id}`).delete() } catch (e) {}
      try { const ps = await admin.firestore().collection('payouts').where('jobId', '==', jobRef.id).get(); for (const d of ps.docs) await admin.firestore().doc(d.ref.path).delete() } catch (e) {}
      try { await admin.auth().deleteUser(courier.uid) } catch (e) {}
      try { await admin.firestore().doc(`users/${courier.uid}`).delete() } catch (e) {}
    }
  })
})
