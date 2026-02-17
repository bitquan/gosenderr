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
  // optional idempotency: key + actor (actor defaults to metadata.actorUid if present)
  idempotencyKey?: string
  idempotencyActor?: string
}

interface AdjustTokenWalletRequest {
  targetUid?: string
  delta?: number
  reason?: string
  metadata?: Record<string, unknown>
  // optional idempotency key to make admin adjustments idempotent
  idempotencyKey?: string
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

  // idempotency support (optional)
  const idempotencyKey = (input.idempotencyKey || '').trim() || null
  const idempotencyActor = (input.idempotencyActor || (input.metadata?.actorUid as string) || '').trim() || null
  const idemRef = idempotencyKey && idempotencyActor
    ? admin.firestore().doc(`idempotency/${idempotencyActor}:${idempotencyKey}`)
    : null

  // short-circuit if idempotency record already exists
  if (idemRef) {
    const existing = await idemRef.get()
    if (existing.exists) {
      // return current snapshot (no-op)
      const userSnap = await admin.firestore().doc(`users/${input.uid}`).get()
      return resolveTokenWalletSnapshot((userSnap.data() || {}) as Record<string, any>)
    }
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

    const tsValue = (admin.firestore && (admin.firestore as any).FieldValue && (admin.firestore as any).FieldValue.serverTimestamp)
      ? (admin.firestore as any).FieldValue.serverTimestamp()
      : new Date().toISOString()

    tx.set(
      userRef,
      {
        courierProfile: {
          tokenWallet: {
            balance: nextSummary.balance,
            currency: nextSummary.currency,
            updatedAt: tsValue,
          },
        },
        tokenWallet: {
          balance: nextSummary.balance,
          currency: nextSummary.currency,
          updatedAt: tsValue,
        },
        updatedAt: tsValue,
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
      createdAt: tsValue,
    })

    // persist idempotency record inside same transaction when requested
    if (idemRef) {
      tx.set(idemRef, {
        command: 'applyTokenWalletDelta',
        uid: input.uid,
        delta,
        reason: input.reason,
        createdAt: tsValue,
        actor: idempotencyActor,
      })
    }
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
    console.log('adjustTokenWalletBalance called', { authUid: request.auth?.uid, data: request.data })

    try {
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
      const idempotencyKey = (request.data?.idempotencyKey || '').trim() || null

      if (!targetUid) {
        throw new functions.https.HttpsError('invalid-argument', 'targetUid is required')
      }

      if (!Number.isFinite(delta) || delta === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'delta must be a non-zero number')
      }

      // short-circuit if idempotency record already exists for this admin actor
      if (idempotencyKey) {
        const idemRef = admin.firestore().doc(`idempotency/${request.auth.uid}:${idempotencyKey}`)
        const existing = await idemRef.get()
        if (existing.exists) {
          // return current snapshot and mark duplicate
          const userSnap = await admin.firestore().doc(`users/${targetUid}`).get()
          const snapshot = resolveTokenWalletSnapshot((userSnap.data() || {}) as Record<string, any>)
          return { targetUid, ...snapshot, duplicate: true }
        }
      }

      const summary = await applyTokenWalletDelta({
        uid: targetUid,
        delta,
        reason,
        idempotencyKey: idempotencyKey || undefined,
        idempotencyActor: request.auth.uid,
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
    } catch (err: any) {
      console.error('adjustTokenWalletBalance handler error:', err && err.stack ? err.stack : err)
      throw err instanceof functions.https.HttpsError ? err : new functions.https.HttpsError('internal', (err && err.message) || 'internal error')
    }
  },
)
