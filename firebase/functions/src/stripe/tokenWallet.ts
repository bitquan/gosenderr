import * as functions from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
import { logAdminAction, verifyAdmin } from '../utils/adminUtils'

const DEFAULT_TOKEN_CURRENCY = 'TOKENS'

interface TokenWalletSummary {
  balance: number
  currency: string
}

interface ApplyTokenWalletDeltaInput {
  uid: string
  delta: number
  reason: string
  metadata?: Record<string, unknown>
}

interface AdjustTokenWalletRequest {
  targetUid?: string
  delta?: number
  reason?: string
  metadata?: Record<string, unknown>
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function resolveTokenWalletSnapshot(userData: Record<string, any>): TokenWalletSummary {
  const balance = toNumber(
    userData?.courierProfile?.tokenWallet?.balance ??
      userData?.tokenWallet?.balance ??
      userData?.wallet?.tokenBalance ??
      0,
  )

  const currency =
    userData?.courierProfile?.tokenWallet?.currency ||
    userData?.tokenWallet?.currency ||
    DEFAULT_TOKEN_CURRENCY

  return { balance, currency }
}

export async function applyTokenWalletDelta(
  input: ApplyTokenWalletDeltaInput,
): Promise<TokenWalletSummary> {
  if (!input.uid) {
    throw new functions.https.HttpsError('invalid-argument', 'uid is required')
  }

  const delta = toNumber(input.delta)
  if (!Number.isFinite(delta) || delta === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'delta must be a non-zero number')
  }

  const userRef = admin.firestore().doc(`users/${input.uid}`)
  const ledgerRef = userRef.collection('tokenWalletLedger').doc()
  let nextSummary: TokenWalletSummary = { balance: 0, currency: DEFAULT_TOKEN_CURRENCY }

  await admin.firestore().runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef)
    if (!userSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'target user does not exist')
    }

    const userData = (userSnap.data() || {}) as Record<string, any>
    const currentSummary = resolveTokenWalletSnapshot(userData)
    const nextBalance = Math.max(0, currentSummary.balance + delta)

    nextSummary = {
      balance: nextBalance,
      currency: currentSummary.currency || DEFAULT_TOKEN_CURRENCY,
    }

    tx.set(
      userRef,
      {
        courierProfile: {
          tokenWallet: {
            balance: nextSummary.balance,
            currency: nextSummary.currency,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
        tokenWallet: {
          balance: nextSummary.balance,
          currency: nextSummary.currency,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    tx.set(ledgerRef, {
      uid: input.uid,
      reason: input.reason,
      delta,
      beforeBalance: currentSummary.balance,
      afterBalance: nextSummary.balance,
      currency: nextSummary.currency,
      metadata: input.metadata || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  })

  return nextSummary
}

export const getTokenWalletSummary = functions.https.onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
  }

  const userSnap = await admin.firestore().doc(`users/${request.auth.uid}`).get()
  if (!userSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found')
  }

  return resolveTokenWalletSnapshot((userSnap.data() || {}) as Record<string, any>)
})

export const adjustTokenWalletBalance = functions.https.onCall(
  async (request: functions.https.CallableRequest<AdjustTokenWalletRequest>) => {
    if (!request.auth?.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
    }

    const isAdmin = await verifyAdmin(request.auth.uid)
    if (!isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin privileges required')
    }

    const targetUid = request.data?.targetUid?.trim()
    const reason = request.data?.reason?.trim() || 'admin_adjustment'
    const delta = toNumber(request.data?.delta)

    if (!targetUid) {
      throw new functions.https.HttpsError('invalid-argument', 'targetUid is required')
    }

    if (!Number.isFinite(delta) || delta === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'delta must be a non-zero number')
    }

    const summary = await applyTokenWalletDelta({
      uid: targetUid,
      delta,
      reason,
      metadata: {
        actorUid: request.auth.uid,
        source: 'adjustTokenWalletBalance',
        ...(request.data?.metadata || {}),
      },
    })

    await logAdminAction({
      adminId: request.auth.uid,
      action: 'adjust_token_wallet_balance',
      targetUserId: targetUid,
      metadata: {
        delta,
        reason,
        resultingBalance: summary.balance,
      },
    })

    return {
      targetUid,
      ...summary,
    }
  },
)

interface CheckoutSessionLike {
  id?: string
  metadata?: Record<string, unknown>
  payment_intent?: string | null
}

export async function creditTokensFromCheckoutSession(session: CheckoutSessionLike): Promise<void> {
  const sessionId = typeof session?.id === 'string' ? session.id.trim() : ''
  if (!sessionId) {
    throw new functions.https.HttpsError('invalid-argument', 'checkout session id is required')
  }

  const metadata = (session?.metadata || {}) as Record<string, unknown>
  const purchaseType = typeof metadata.purchaseType === 'string' ? metadata.purchaseType : ''
  if (purchaseType && purchaseType !== 'token_purchase') {
    return
  }

  const uid = typeof metadata.uid === 'string' ? metadata.uid.trim() : ''
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'uid is required for token wallet credit')
  }

  const tokens = toNumber(metadata.tokens)
  if (!Number.isFinite(tokens) || tokens <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'tokens must be a positive number')
  }

  const db = admin.firestore()
  const walletRef = db.doc(`tokenWallets/${uid}`)
  const txRef = db.doc(`tokenTransactions/stripe_purchase_${sessionId}`)
  const now = admin.firestore.FieldValue.serverTimestamp()

  await db.runTransaction(async (tx) => {
    const [walletSnap, txSnap] = await Promise.all([tx.get(walletRef), tx.get(txRef)])

    if (txSnap.exists) {
      return
    }

    const walletData = (walletSnap.data() || {}) as Record<string, unknown>
    const available = toNumber(walletData.available)
    const reserved = toNumber(walletData.reserved)
    const lifetimePurchased = toNumber(walletData.lifetimePurchased)
    const lifetimeSpent = toNumber(walletData.lifetimeSpent)
    const lifetimeAdjusted = toNumber(walletData.lifetimeAdjusted)

    tx.set(
      walletRef,
      {
        uid,
        available: available + tokens,
        reserved,
        lifetimePurchased: lifetimePurchased + tokens,
        lifetimeSpent,
        lifetimeAdjusted,
        updatedAt: now,
      },
      { merge: true },
    )

    tx.set(
      txRef,
      {
        uid,
        type: 'purchase',
        action: 'token_purchase',
        amount: tokens,
        tokens,
        stripeSessionId: sessionId,
        paymentIntentId: session.payment_intent || null,
        idempotencyKey:
          typeof metadata.idempotencyKey === 'string' ? metadata.idempotencyKey : `stripe_purchase_${sessionId}`,
        metadata,
        createdAt: now,
      },
      { merge: true },
    )
  })
}
