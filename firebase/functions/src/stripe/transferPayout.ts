import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { getStripeClient } from './stripeSecrets'

type CourierPayoutMode = 'stripe_connect' | 'external_provider' | 'manual_settlement'
type CourierPayoutExecution = 'stripe_connect' | 'stripe_connect_fallback' | 'deferred_non_stripe'

function parseCourierPayoutMode(value: unknown): CourierPayoutMode {
  if (value === 'external_provider' || value === 'manual_settlement' || value === 'stripe_connect') {
    return value
  }
  return 'stripe_connect'
}

function toMoneyNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, value)
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed)
    }
  }
  return 0
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

  let courierEarnings = 0 as number
  let platformFeeAmount = 0 as number
  let courierPayoutMode: CourierPayoutMode = 'stripe_connect'
  let courierPayoutExecution: CourierPayoutExecution = 'stripe_connect'
  try {
    const [courierDoc, featureFlagsDoc] = await Promise.all([
      admin.firestore().doc(`users/${courierUid}`).get(),
      admin.firestore().doc('featureFlags/config').get(),
    ])
    const courierData = courierDoc.data() || {}
    const courierProfile = (courierData?.courierProfile || {}) as Record<string, unknown>
    const courierAccountId =
      courierProfile?.stripeConnectAccountId ||
      courierProfile?.stripeAccountId

    const featureFlags = featureFlagsDoc.exists ? (featureFlagsDoc.data() || {}) : {}
    const allowNonStripeCourierPayouts = Boolean(
      (featureFlags as Record<string, any>)?.payments?.senderrplaceNonStripeCourierPayouts ??
      (featureFlags as Record<string, any>)?.senderrplaceNonStripeCourierPayouts
    )

    const configuredPayoutMode = parseCourierPayoutMode(
      courierProfile?.payoutMode ?? courierProfile?.courierPayoutMode
    )
    courierPayoutMode =
      configuredPayoutMode === 'stripe_connect' || allowNonStripeCourierPayouts
        ? configuredPayoutMode
        : 'stripe_connect'
    courierPayoutExecution =
      courierPayoutMode === 'stripe_connect'
        ? configuredPayoutMode === 'stripe_connect'
          ? 'stripe_connect'
          : 'stripe_connect_fallback'
        : 'deferred_non_stripe'

    courierEarnings = (afterData.pricing?.courierEarnings ?? afterData.agreedFee ?? 0) as number
    platformFeeAmount = toMoneyNumber(
      afterData.pricing?.platformFees ??
      afterData.pricing?.platformFee ??
      afterData.pricing?.breakdown?.platformFee ??
      afterData.platformFee
    )

    if (courierPayoutMode !== 'stripe_connect') {
      functions.logger.info(
        `Job ${jobId}: courier ${courierUid} using non-stripe payout mode ${courierPayoutMode}; deferring payout transfer`
      )

      await admin.firestore().collection('deliveryJobs').doc(jobId).update({
        'payout.status': 'deferred_non_stripe',
        'payout.mode': courierPayoutMode,
        'payout.execution': courierPayoutExecution,
        'payout.amount': courierEarnings,
        'payout.platformFeeAmount': platformFeeAmount,
        'payout.platformFeeStatus': 'captured',
        'payout.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
        courier_earnings_status: 'deferred_non_stripe',
        courier_platform_fee_status: 'captured',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      await admin.firestore().collection('payouts').add({
        courierUid,
        jobId,
        amount: courierEarnings,
        status: 'deferred_non_stripe',
        payoutMode: courierPayoutMode,
        payoutExecution: courierPayoutExecution,
        platformFeeAmount,
        platformFeeStatus: 'captured',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      return {
        success: true,
        deferred: true,
        payoutMode: courierPayoutMode,
        payoutExecution: courierPayoutExecution,
      }
    }

    const stripe = stripeClient || await getStripeClient()

    if (!courierAccountId) {
      functions.logger.warn(`Job ${jobId}: courier ${courierUid} missing stripe account id; marking payout pending_setup`)
      await admin.firestore().collection('deliveryJobs').doc(jobId).update({
        'payout.status': 'pending_setup',
        'payout.mode': courierPayoutMode,
        'payout.execution': courierPayoutExecution,
        'payout.amount': courierEarnings,
        'payout.platformFeeAmount': platformFeeAmount,
        'payout.platformFeeStatus': 'captured',
        'payout.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
        courier_earnings_status: 'pending_setup',
        courier_platform_fee_status: 'captured',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // create payouts record in pending state
      await admin.firestore().collection('payouts').add({
        courierUid,
        jobId,
        amount: courierEarnings,
        status: 'pending_setup',
        payoutMode: courierPayoutMode,
        payoutExecution: courierPayoutExecution,
        platformFeeAmount,
        platformFeeStatus: 'captured',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // TODO: send notification to courier to complete Stripe onboarding
      return {
        success: false,
        reason: 'missing_stripe_account',
        payoutMode: courierPayoutMode,
        payoutExecution: courierPayoutExecution,
      }
    }

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
      payoutMode: courierPayoutMode,
      payoutExecution: courierPayoutExecution,
      platformFeeAmount,
      platformFeeStatus: 'captured',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    await admin.firestore().collection('deliveryJobs').doc(jobId).update({
      'payout.status': 'completed',
      'payout.mode': courierPayoutMode,
      'payout.execution': courierPayoutExecution,
      'payout.transferId': transfer.id,
      'payout.amount': courierEarnings,
      'payout.platformFeeAmount': platformFeeAmount,
      'payout.platformFeeStatus': 'captured',
      'payout.transferredAt': admin.firestore.FieldValue.serverTimestamp(),
      courier_earnings_status: 'captured',
      courier_platform_fee_status: 'captured',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return {
      success: true,
      transferId: transfer.id,
      payoutMode: courierPayoutMode,
      payoutExecution: courierPayoutExecution,
    }
  } catch (err: any) {
    functions.logger.error(`Job ${jobId}: transfer payout error`, err)
    // mark payout failed
    try {
      await admin.firestore().collection('deliveryJobs').doc(jobId).update({
        'payout.status': 'failed',
        'payout.mode': courierPayoutMode,
        'payout.execution': courierPayoutExecution,
        'payout.platformFeeAmount': platformFeeAmount,
        'payout.platformFeeStatus': 'captured',
        'payout.errorMessage': err.message,
        courier_earnings_status: 'failed',
        courier_platform_fee_status: 'captured',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      await admin.firestore().collection('payouts').add({
        courierUid,
        jobId,
        amount: courierEarnings,
        status: 'failed',
        payoutMode: courierPayoutMode,
        payoutExecution: courierPayoutExecution,
        platformFeeAmount,
        platformFeeStatus: 'captured',
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
