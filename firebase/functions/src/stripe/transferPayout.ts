import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import Stripe from 'stripe'

function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(apiKey, { apiVersion: '2025-02-24.acacia' })
}

/**
 * Handler that can be called directly in tests: accepts a Change snapshot and optional stripe client
 */
export async function transferPayoutHandler(change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context: functions.EventContext, stripeClient?: any) {
  const beforeData = change.before?.data() || {}
  const afterData = change.after?.data() || {}
  const jobId = context.params.jobId

  // guard conditions
  const confirmationChanged = !beforeData.customerConfirmation?.received && afterData.customerConfirmation?.received === true
  const isPaymentCaptured = afterData.paymentStatus === 'captured'
  const courierUid = afterData.courierUid
  const payoutNotCompleted = !(afterData.payout && afterData.payout.status === 'completed')

  if (!confirmationChanged || !isPaymentCaptured || !courierUid || !payoutNotCompleted) {
    functions.logger.info(`Job ${jobId}: transferPayout guard failed (confirmationChanged=${confirmationChanged}, isPaymentCaptured=${isPaymentCaptured}, courierUid=${!!courierUid}, payoutNotCompleted=${payoutNotCompleted})`)
    return null
  }

  const stripe = stripeClient || getStripe()

  // compute amounts early so catch block can reference them
  const courierEarnings = (afterData.pricing?.courierEarnings ?? afterData.agreedFee ?? 0) as number
  const platformFee = (afterData.pricing?.platformFees ?? afterData.platformFee ?? 0) as number

  try {
    // Fetch courier profile
    const courierDoc = await admin.firestore().doc(`users/${courierUid}`).get()
    const courierData = courierDoc.data() || {}
    const courierAccountId = courierData?.courierProfile?.stripeAccountId

    if (!courierAccountId) {
      functions.logger.warn(`Job ${jobId}: courier ${courierUid} missing stripe account id; marking payout pending_setup`)
      await admin.firestore().collection('deliveryJobs').doc(jobId).update({
        'payout.status': 'pending_setup',
        'payout.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // create payouts record in pending state
      await admin.firestore().collection('payouts').add({
        courierUid,
        jobId,
        amount: courierEarnings,
        status: 'pending_setup',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // TODO: send notification to courier to complete Stripe onboarding
      return { success: false, reason: 'missing_stripe_account' }
    }

    // Log platform fee for auditing
    functions.logger.info(`Job ${jobId}: platform fee ${platformFee}`)

    // Create transfer
    const amountCents = Math.round(courierEarnings * 100)
    functions.logger.info(`Job ${jobId}: creating transfer to ${courierAccountId} for ${amountCents} cents`)

    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: 'usd',
      destination: courierAccountId,
      transfer_group: jobId,
      metadata: { jobId, courierUid },
    })

    functions.logger.info(`Job ${jobId}: transfer created ${transfer.id}`)

    // Write payout record and update job doc
    await admin.firestore().collection('payouts').add({
      courierUid,
      jobId,
      amount: courierEarnings,
      stripeTransferId: transfer.id,
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    await admin.firestore().collection('deliveryJobs').doc(jobId).update({
      'payout.status': 'completed',
      'payout.transferId': transfer.id,
      'payout.amount': courierEarnings,
      'payout.transferredAt': admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { success: true, transferId: transfer.id }
  } catch (err: any) {
    functions.logger.error(`Job ${jobId}: transfer payout error`, err)
    // mark payout failed
    try {
      await admin.firestore().collection('deliveryJobs').doc(jobId).update({
        'payout.status': 'failed',
        'payout.errorMessage': err.message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      await admin.firestore().collection('payouts').add({
        courierUid,
        jobId,
        amount: courierEarnings,
        status: 'failed',
        errorMessage: err.message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    } catch (e) {
      functions.logger.error(`Job ${jobId}: error updating failure state`, e)
    }

    // TODO: admin notification
    return { success: false, error: err.message }
  }
}

export const transferPayout = functions.firestore.document('deliveryJobs/{jobId}').onUpdate(async (change, context) => {
  return transferPayoutHandler(change as any, context as any)
})
