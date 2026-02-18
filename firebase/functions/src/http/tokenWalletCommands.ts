import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getStripeClient } from "../stripe/stripeSecrets";
import { logAdminAction, verifyAdmin } from "../utils/adminUtils";

const serverTimestamp = (): Date => new Date();
const isFunctionsEmulator =
  process.env.FUNCTIONS_EMULATOR === "true" || Boolean(process.env.FIREBASE_EMULATOR_HUB);

interface TokenPolicy {
  enabled: boolean;
  finalSale: boolean;
  tokenValueUsd: number;
  costs: Record<string, number>;
  packs: Array<{
    id: string;
    tokens: number;
    priceUsd: number;
    stripePriceId?: string;
    name?: string;
    active?: boolean;
  }>;
}

interface TokenWalletSummary {
  uid: string;
  available: number;
  reserved: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
  lifetimeAdjusted: number;
  updatedAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue | Date;
}

type WalletType = "utility" | "payout";

interface WalletSummaryRequest {
  walletType?: WalletType;
}

interface TokenReserveRequest {
  action?: string;
  amount?: number;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  targetUid?: string;
  walletType?: WalletType;
}

interface TokenCommitRequest {
  reservationId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  walletType?: WalletType;
}

interface TokenReleaseRequest {
  reservationId?: string;
  idempotencyKey?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  walletType?: WalletType;
}

interface TokenRefundRequest {
  reservationId?: string;
  amount?: number;
  idempotencyKey?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  walletType?: WalletType;
}

interface AdjustTokenWalletBalanceRequest {
  targetUid?: string;
  delta?: number;
  reason?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

interface TokenCreateCheckoutSessionRequest {
  packId?: string;
  successUrl?: string;
  cancelUrl?: string;
  idempotencyKey?: string;
}

interface AdminGetTokenWalletViewRequest {
  targetUid?: string;
  targetEmail?: string;
  walletType?: WalletType;
}

interface AdminListTokenLedgerRequest {
  targetUid?: string;
  targetEmail?: string;
  action?: string;
  type?: string;
  includeCashFeeOnly?: boolean;
  limit?: number;
  walletType?: WalletType;
}

const DEFAULT_TOKEN_POLICY: TokenPolicy = {
  enabled: true,
  finalSale: true,
  tokenValueUsd: 0.1,
  costs: {
    jobUnlockStandard: 1,
    jobUnlockPriority: 2,
    jobUnlockHeavy: 3,
    listingPublish: 2,
    cashFee: 1,
    adBoost24h: 5,
    adBoost7d: 25,
    adBoost30d: 80,
    adFeatured7d: 120,
  },
  packs: [
    { id: 'starter_100', name: 'Starter 100', tokens: 100, priceUsd: 10, active: true },
    { id: 'pro_250', name: 'Pro 250', tokens: 250, priceUsd: 25, active: true },
    { id: 'growth_600', name: 'Growth 600', tokens: 600, priceUsd: 60, active: true },
  ],
};

function normalizeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new functions.https.HttpsError("invalid-argument", `${fieldName} is required`);
  }
  return normalized;
}

function txDocId(type: string, idempotencyKey: string): string {
  const safe = idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${type}_${safe}`;
}

function normalizeWalletType(value: unknown): WalletType {
  return value === "payout" ? "payout" : "utility";
}

function getWalletCollections(walletType: WalletType): {
  wallets: string;
  reservations: string;
  transactions: string;
} {
  if (walletType === "payout") {
    return {
      wallets: "payoutTokenWallets",
      reservations: "payoutTokenReservations",
      transactions: "payoutTokenTransactions",
    };
  }

  return {
    wallets: "tokenWallets",
    reservations: "tokenReservations",
    transactions: "tokenTransactions",
  };
}

function walletFromSnapshot(
  uid: string,
  snap?: FirebaseFirestore.DocumentSnapshot,
): TokenWalletSummary {
  const data = snap?.exists ? (snap.data() as Record<string, unknown>) : {};

  return {
    uid,
    available: normalizeNumber(data?.available),
    reserved: normalizeNumber(data?.reserved),
    lifetimePurchased: normalizeNumber(data?.lifetimePurchased),
    lifetimeSpent: normalizeNumber(data?.lifetimeSpent),
    lifetimeAdjusted: normalizeNumber(data?.lifetimeAdjusted),
    updatedAt:
      (data?.updatedAt as FirebaseFirestore.Timestamp | undefined) ||
      serverTimestamp(),
  };
}

async function getTokenPolicyInternal(): Promise<TokenPolicy> {
  const snap = await admin.firestore().doc('platformSettings/tokenPolicy').get();
  if (!snap.exists) {
    return DEFAULT_TOKEN_POLICY;
  }

  const data = (snap.data() || {}) as Partial<TokenPolicy>;
  return {
    ...DEFAULT_TOKEN_POLICY,
    ...data,
    costs: {
      ...DEFAULT_TOKEN_POLICY.costs,
      ...(data.costs || {}),
    },
    packs: Array.isArray(data.packs) ? data.packs : DEFAULT_TOKEN_POLICY.packs,
  };
}

function ensureNonNegative(value: number, errorMessage: string): void {
  if (value < 0) {
    throw new functions.https.HttpsError('failed-precondition', errorMessage);
  }
}

function timestampToMillis(value: unknown): number {
  if (!value) return 0;

  if (value instanceof Date) {
    return value.getTime();
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toMillis' in (value as Record<string, unknown>) &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return ((value as { toMillis: () => number }).toMillis() || 0);
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in (value as Record<string, unknown>)
  ) {
    const seconds = Number((value as { seconds?: unknown }).seconds || 0);
    const nanos = Number((value as { nanoseconds?: unknown }).nanoseconds || 0);
    return seconds * 1000 + Math.floor(nanos / 1_000_000);
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function resolveAdminTarget(
  targetUidRaw?: string,
  targetEmailRaw?: string,
): Promise<{ uid: string; email: string | null; displayName: string | null; role: string | null } | null> {
  const targetUid = targetUidRaw?.trim();
  const targetEmail = targetEmailRaw?.trim().toLowerCase();

  if (!targetUid && !targetEmail) {
    return null;
  }

  let uid = targetUid || '';
  let authUser: admin.auth.UserRecord | null = null;

  if (!uid && targetEmail) {
    try {
      authUser = await admin.auth().getUserByEmail(targetEmail);
      uid = authUser.uid;
    } catch (error: unknown) {
      throw new functions.https.HttpsError('not-found', 'No user found for targetEmail');
    }
  }

  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'targetUid or targetEmail is required');
  }

  if (!authUser) {
    try {
      authUser = await admin.auth().getUser(uid);
    } catch (error: unknown) {
      throw new functions.https.HttpsError('not-found', 'No user found for targetUid');
    }
  }

  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  const userData = userDoc.exists ? (userDoc.data() as Record<string, unknown>) : {};

  return {
    uid,
    email:
      (typeof userData?.email === 'string' ? String(userData.email) : null) ||
      authUser.email ||
      null,
    displayName:
      (typeof userData?.fullName === 'string' ? String(userData.fullName) : null) ||
      authUser.displayName ||
      null,
    role: typeof userData?.role === 'string' ? String(userData.role) : null,
  };
}

export const getTokenPolicy = functions.https.onCall(async (_data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required',
    );
  }

  return getTokenPolicyInternal();
});

export const getTokenWalletSummary = functions.https.onCall(async (data: WalletSummaryRequest, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required',
    );
  }

  const uid = context.auth.uid;
  const walletType = normalizeWalletType(data?.walletType);
  const collections = getWalletCollections(walletType);
  const walletRef = admin.firestore().doc(`${collections.wallets}/${uid}`);
  const walletSnap = await walletRef.get();
  return {
    ...walletFromSnapshot(uid, walletSnap),
    walletType,
  };
});

export const getPayoutTokenWalletSummary = functions.https.onCall(async (_data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required',
    );
  }

  const uid = context.auth.uid;
  const walletRef = admin.firestore().doc(`payoutTokenWallets/${uid}`);
  const walletSnap = await walletRef.get();
  return {
    ...walletFromSnapshot(uid, walletSnap),
    walletType: 'payout' as const,
  };
});

export const adminGetTokenWalletView = functions.https.onCall(
  async (data: AdminGetTokenWalletViewRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const isAdmin = await verifyAdmin(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
    }

    const target = await resolveAdminTarget(data?.targetUid, data?.targetEmail);
    if (!target) {
      throw new functions.https.HttpsError('invalid-argument', 'targetUid or targetEmail is required');
    }

    const walletType = normalizeWalletType(data?.walletType);
    const collections = getWalletCollections(walletType);
    const walletSnap = await admin.firestore().doc(`${collections.wallets}/${target.uid}`).get();
    const wallet = walletFromSnapshot(target.uid, walletSnap);

    return {
      user: target,
      wallet,
      walletType,
    };
  },
);

export const adminListTokenLedger = functions.https.onCall(
  async (data: AdminListTokenLedgerRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const isAdmin = await verifyAdmin(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
    }

    const requestedLimit = Math.floor(normalizeNumber(data?.limit));
    const limitSize = Math.min(Math.max(requestedLimit || 100, 1), 300);
    const fetchSize = Math.min(limitSize * 5, 500);

    const actionFilter = typeof data?.action === 'string' ? data.action.trim() : '';
    const typeFilter = typeof data?.type === 'string' ? data.type.trim() : '';
    const includeCashFeeOnly = Boolean(data?.includeCashFeeOnly);
    const walletType = normalizeWalletType(data?.walletType);
    const collections = getWalletCollections(walletType);

    const target = await resolveAdminTarget(data?.targetUid, data?.targetEmail);
    const db = admin.firestore();

    let queryRef: FirebaseFirestore.Query = db.collection(collections.transactions).limit(fetchSize);
    if (target?.uid) {
      queryRef = db
        .collection(collections.transactions)
        .where('uid', '==', target.uid)
        .limit(fetchSize);
    }

    const snap = await queryRef.get();
    const filtered = snap.docs
      .map((doc): Record<string, unknown> => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
      .filter((row) => {
        const rowAction = String((row as { action?: unknown }).action || '');
        const rowType = String((row as { type?: unknown }).type || '');

        if (includeCashFeeOnly && rowAction !== 'cash_fee') {
          return false;
        }

        if (actionFilter && rowAction !== actionFilter) {
          return false;
        }

        if (typeFilter && rowType !== typeFilter) {
          return false;
        }

        return true;
      })
      .sort(
        (left, right) =>
          timestampToMillis((right as { createdAt?: unknown }).createdAt) -
          timestampToMillis((left as { createdAt?: unknown }).createdAt),
      )
      .slice(0, limitSize);

    return {
      target: target || null,
      count: filtered.length,
      rows: filtered,
      walletType,
    };
  },
);

export const tokenReserve = functions.https.onCall(
  async (data: TokenReserveRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const actorUid = context.auth.uid;
    const idempotencyKey = requireNonEmptyString(data?.idempotencyKey, 'idempotencyKey');
    const action = requireNonEmptyString(data?.action, 'action');
    const amount = normalizeNumber(data?.amount);
    const targetUid = data?.targetUid?.trim() || actorUid;
    const walletType = normalizeWalletType(data?.walletType);
    const collections = getWalletCollections(walletType);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'amount must be a positive number');
    }

    const db = admin.firestore();
    const reservationRef = db.doc(`${collections.reservations}/${idempotencyKey}`);
    const txRef = db.doc(`${collections.transactions}/${txDocId('reserve', idempotencyKey)}`);
    const walletRef = db.doc(`${collections.wallets}/${targetUid}`);

    let wallet: TokenWalletSummary = {
      uid: targetUid,
      available: 0,
      reserved: 0,
      lifetimePurchased: 0,
      lifetimeSpent: 0,
      lifetimeAdjusted: 0,
    };

    await db.runTransaction(async (tx) => {
      const [walletSnap, txSnap, reservationSnap] = await Promise.all([
        tx.get(walletRef),
        tx.get(txRef),
        tx.get(reservationRef),
      ]);

      if (txSnap.exists && reservationSnap.exists) {
        wallet = walletFromSnapshot(targetUid, walletSnap);
        return;
      }

      const current = walletFromSnapshot(targetUid, walletSnap);
      const nextAvailable = current.available - amount;
      ensureNonNegative(nextAvailable, 'Insufficient token balance');

      wallet = {
        ...current,
        available: nextAvailable,
        reserved: current.reserved + amount,
        updatedAt: serverTimestamp(),
      };

      tx.set(walletRef, {
        available: wallet.available,
        reserved: wallet.reserved,
        lifetimePurchased: wallet.lifetimePurchased,
        lifetimeSpent: wallet.lifetimeSpent,
        lifetimeAdjusted: wallet.lifetimeAdjusted,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      tx.set(reservationRef, {
        uid: targetUid,
        walletType,
        action,
        amount,
        status: 'reserved',
        idempotencyKey,
        metadata: data?.metadata || {},
        actorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      tx.set(txRef, {
        uid: targetUid,
        walletType,
        type: 'reserve',
        actorType: 'courier',
        action,
        amount,
        idempotencyKey,
        reservationId: idempotencyKey,
        metadata: data?.metadata || {},
        createdAt: serverTimestamp(),
      }, { merge: true });
    });

    return {
      reservationId: idempotencyKey,
      walletType,
      wallet,
    };
  },
);

export const tokenCommit = functions.https.onCall(
  async (data: TokenCommitRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const actorUid = context.auth.uid;
    const reservationId = requireNonEmptyString(data?.reservationId, 'reservationId');
    const idempotencyKey = requireNonEmptyString(data?.idempotencyKey, 'idempotencyKey');
    const walletType = normalizeWalletType(data?.walletType);
    const collections = getWalletCollections(walletType);

    const db = admin.firestore();
    const reservationRef = db.doc(`${collections.reservations}/${reservationId}`);
    const txRef = db.doc(`${collections.transactions}/${txDocId('commit', idempotencyKey)}`);

    let resultWallet: TokenWalletSummary | null = null;

    await db.runTransaction(async (tx) => {
      const [reservationSnap, txSnap] = await Promise.all([
        tx.get(reservationRef),
        tx.get(txRef),
      ]);

      if (txSnap.exists) {
        const existingReservation = await tx.get(reservationRef);
        const uid = (existingReservation.data()?.uid as string) || actorUid;
        const existingWallet = await tx.get(db.doc(`${collections.wallets}/${uid}`));
        resultWallet = walletFromSnapshot(uid, existingWallet);
        return;
      }

      if (!reservationSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Reservation not found');
      }

      const reservation = reservationSnap.data() as {
        uid: string;
        amount: number;
        action: string;
        status: string;
        walletType?: WalletType;
      };

      if (reservation.uid !== actorUid) {
        throw new functions.https.HttpsError('permission-denied', 'Reservation owner mismatch');
      }

      if (reservation.status !== 'reserved') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Reservation is ${reservation.status}, expected reserved`,
        );
      }

      const walletRef = db.doc(`${collections.wallets}/${reservation.uid}`);
      const walletSnap = await tx.get(walletRef);
      const current = walletFromSnapshot(reservation.uid, walletSnap);
      const nextReserved = current.reserved - reservation.amount;
      ensureNonNegative(nextReserved, 'Reserved balance underflow');

      resultWallet = {
        ...current,
        reserved: nextReserved,
        lifetimeSpent: current.lifetimeSpent + reservation.amount,
        updatedAt: serverTimestamp(),
      };

      const committedWallet = resultWallet as TokenWalletSummary;

      tx.set(walletRef, {
        available: committedWallet.available,
        reserved: committedWallet.reserved,
        lifetimePurchased: committedWallet.lifetimePurchased,
        lifetimeSpent: committedWallet.lifetimeSpent,
        lifetimeAdjusted: committedWallet.lifetimeAdjusted,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      tx.set(reservationRef, {
        status: 'committed',
        committedAt: serverTimestamp(),
        commitIdempotencyKey: idempotencyKey,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      tx.set(txRef, {
        uid: reservation.uid,
        walletType,
        type: 'commit',
        actorType: 'courier',
        action: reservation.action,
        amount: reservation.amount,
        idempotencyKey,
        reservationId,
        metadata: data?.metadata || {},
        createdAt: serverTimestamp(),
      }, { merge: true });
    });

    return {
      reservationId,
      walletType,
      wallet: resultWallet,
    };
  },
);

export const tokenRelease = functions.https.onCall(
  async (data: TokenReleaseRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const actorUid = context.auth.uid;
    const reservationId = requireNonEmptyString(data?.reservationId, 'reservationId');
    const idempotencyKey = requireNonEmptyString(data?.idempotencyKey, 'idempotencyKey');
    const walletType = normalizeWalletType(data?.walletType);
    const collections = getWalletCollections(walletType);

    const db = admin.firestore();
    const reservationRef = db.doc(`${collections.reservations}/${reservationId}`);
    const txRef = db.doc(`${collections.transactions}/${txDocId('release', idempotencyKey)}`);

    let resultWallet: TokenWalletSummary | null = null;

    await db.runTransaction(async (tx) => {
      const [reservationSnap, txSnap] = await Promise.all([
        tx.get(reservationRef),
        tx.get(txRef),
      ]);

      if (txSnap.exists) {
        return;
      }

      if (!reservationSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Reservation not found');
      }

      const reservation = reservationSnap.data() as {
        uid: string;
        amount: number;
        action: string;
        status: string;
        walletType?: WalletType;
      };

      if (reservation.uid !== actorUid) {
        const isAdmin = await verifyAdmin(actorUid);
        if (!isAdmin) {
          throw new functions.https.HttpsError('permission-denied', 'Reservation owner mismatch');
        }
      }

      if (reservation.status !== 'reserved') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Reservation is ${reservation.status}, expected reserved`,
        );
      }

      const walletRef = db.doc(`${collections.wallets}/${reservation.uid}`);
      const walletSnap = await tx.get(walletRef);
      const current = walletFromSnapshot(reservation.uid, walletSnap);

      const nextReserved = current.reserved - reservation.amount;
      ensureNonNegative(nextReserved, 'Reserved balance underflow');

      resultWallet = {
        ...current,
        available: current.available + reservation.amount,
        reserved: nextReserved,
        updatedAt: serverTimestamp(),
      };

      const releasedWallet = resultWallet as TokenWalletSummary;

      tx.set(walletRef, {
        available: releasedWallet.available,
        reserved: releasedWallet.reserved,
        lifetimePurchased: releasedWallet.lifetimePurchased,
        lifetimeSpent: releasedWallet.lifetimeSpent,
        lifetimeAdjusted: releasedWallet.lifetimeAdjusted,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      tx.set(reservationRef, {
        status: 'released',
        releaseReason: data?.reason || 'released',
        releaseIdempotencyKey: idempotencyKey,
        releasedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      tx.set(txRef, {
        uid: reservation.uid,
        walletType,
        type: 'release',
        actorType: 'courier',
        action: reservation.action,
        amount: reservation.amount,
        idempotencyKey,
        reservationId,
        metadata: data?.metadata || {},
        createdAt: serverTimestamp(),
      }, { merge: true });
    });

    return {
      reservationId,
      walletType,
      wallet: resultWallet,
    };
  },
);

export const tokenRefund = functions.https.onCall(
  async (data: TokenRefundRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const actorUid = context.auth.uid;
    const idempotencyKey = requireNonEmptyString(data?.idempotencyKey, 'idempotencyKey');
    const reservationId = requireNonEmptyString(data?.reservationId, 'reservationId');
    const walletType = normalizeWalletType(data?.walletType);
    const collections = getWalletCollections(walletType);

    const policy = await getTokenPolicyInternal();
    const isAdmin = await verifyAdmin(actorUid);
    if (policy.finalSale && !isAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Refunds are disabled by token final-sale policy',
      );
    }

    const db = admin.firestore();
    const txRef = db.doc(`${collections.transactions}/${txDocId('refund', idempotencyKey)}`);
    const reservationRef = db.doc(`${collections.reservations}/${reservationId}`);

    let walletResult: TokenWalletSummary | null = null;

    await db.runTransaction(async (tx) => {
      const [existingRefundSnap, reservationSnap] = await Promise.all([
        tx.get(txRef),
        tx.get(reservationRef),
      ]);

      if (existingRefundSnap.exists) {
        const reservationData = reservationSnap.data() as { uid?: string } | undefined;
        const uid = reservationData?.uid || actorUid;
        const walletSnap = await tx.get(db.doc(`${collections.wallets}/${uid}`));
        walletResult = walletFromSnapshot(uid, walletSnap);
        return;
      }

      if (!reservationSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Reservation not found');
      }

      const reservation = reservationSnap.data() as {
        uid: string;
        amount: number;
        action: string;
        status: string;
      };

      if (reservation.uid !== actorUid && !isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Refund owner mismatch');
      }

      if (reservation.status !== 'committed') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Reservation is ${reservation.status}, expected committed`,
        );
      }

      const amount = data?.amount && data.amount > 0 ? data.amount : reservation.amount;

      const walletRef = db.doc(`${collections.wallets}/${reservation.uid}`);
      const walletSnap = await tx.get(walletRef);
      const current = walletFromSnapshot(reservation.uid, walletSnap);

      walletResult = {
        ...current,
        available: current.available + amount,
        updatedAt: serverTimestamp(),
      };

      const refundedWallet = walletResult as TokenWalletSummary;

      tx.set(walletRef, {
        available: refundedWallet.available,
        reserved: refundedWallet.reserved,
        lifetimePurchased: refundedWallet.lifetimePurchased,
        lifetimeSpent: refundedWallet.lifetimeSpent,
        lifetimeAdjusted: refundedWallet.lifetimeAdjusted,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      tx.set(reservationRef, {
        status: 'refunded',
        refundedAt: serverTimestamp(),
        refundIdempotencyKey: idempotencyKey,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      tx.set(txRef, {
        uid: reservation.uid,
        walletType,
        type: 'refund',
        actorType: isAdmin ? 'admin' : 'courier',
        action: reservation.action,
        amount,
        idempotencyKey,
        reservationId,
        reason: data?.reason || 'policy_refund',
        metadata: data?.metadata || {},
        createdAt: serverTimestamp(),
      }, { merge: true });
    });

    return {
      reservationId,
      walletType,
      wallet: walletResult,
    };
  },
);

export const tokenCreateCheckoutSession = functions.https.onCall(
  async (data: TokenCreateCheckoutSessionRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const uid = context.auth.uid;
    const packId = requireNonEmptyString(data?.packId, 'packId');
    const successUrl = requireNonEmptyString(data?.successUrl, 'successUrl');
    const cancelUrl = requireNonEmptyString(data?.cancelUrl, 'cancelUrl');
    const idempotencyKey = requireNonEmptyString(data?.idempotencyKey, 'idempotencyKey');

    const policy = await getTokenPolicyInternal();
    if (!policy.enabled) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Token purchases are currently disabled',
      );
    }

    const selectedPack = policy.packs.find((pack) => pack.id === packId);
    if (!selectedPack) {
      throw new functions.https.HttpsError('not-found', 'Requested token pack not found');
    }

    const sessionRef = admin.firestore().doc(`tokenCheckoutSessions/${idempotencyKey}`);
    const existingSessionSnap = await sessionRef.get();
    if (existingSessionSnap.exists) {
      const existing = existingSessionSnap.data() as { url?: string; stripeSessionId?: string };
      if (existing?.url && existing?.stripeSessionId) {
        return {
          sessionId: existing.stripeSessionId,
          url: existing.url,
        };
      }
    }

    try {
      const stripe = await getStripeClient();
      const lineItem = selectedPack.stripePriceId
        ? { price: selectedPack.stripePriceId, quantity: 1 }
        : {
            price_data: {
              currency: 'usd',
              product_data: { name: `${selectedPack.tokens} Senderr tokens` },
              unit_amount: Math.round(selectedPack.priceUsd * 100),
            },
            quantity: 1,
          };

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [lineItem],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: uid,
        metadata: {
          purchaseType: 'token_purchase',
          uid,
          packId: selectedPack.id,
          tokens: String(selectedPack.tokens),
          idempotencyKey,
        },
      });

      await sessionRef.set({
        uid,
        idempotencyKey,
        packId: selectedPack.id,
        tokens: selectedPack.tokens,
        priceUsd: selectedPack.priceUsd,
        stripeSessionId: session.id,
        paymentStatus: 'pending',
        url: session.url || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      if (!isFunctionsEmulator) {
        throw error;
      }

      const emulatedSessionId = `emulated_${idempotencyKey}`;
      const emulatedUrl = `${successUrl}${successUrl.includes('?') ? '&' : '?'}tokenCheckout=emulated`;

      console.warn('tokenCreateCheckoutSession emulator fallback', {
        idempotencyKey,
        reason: error instanceof Error ? error.message : 'unknown',
      });

      await sessionRef.set({
        uid,
        idempotencyKey,
        packId: selectedPack.id,
        tokens: selectedPack.tokens,
        priceUsd: selectedPack.priceUsd,
        stripeSessionId: emulatedSessionId,
        paymentStatus: 'emulated',
        url: emulatedUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        metadata: {
          emulatorFallback: true,
        },
      }, { merge: true });

      return {
        sessionId: emulatedSessionId,
        url: emulatedUrl,
      };
    }
  },
);

export const adjustTokenWalletBalance = functions.https.onCall(
  async (data: AdjustTokenWalletBalanceRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required',
      );
    }

    const adminUid = context.auth.uid;
    const isAdmin = await verifyAdmin(adminUid);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Admin privileges required',
      );
    }

    const targetUid = data?.targetUid?.trim();
    const delta = normalizeNumber(data?.delta);
    const reason = data?.reason?.trim() || 'admin_adjustment';
    const idempotencyKey = data?.idempotencyKey?.trim();

    if (!targetUid) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'targetUid is required',
      );
    }

    if (!idempotencyKey) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'idempotencyKey is required',
      );
    }

    if (!Number.isFinite(delta) || delta === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'delta must be a non-zero number',
      );
    }

    const db = admin.firestore();
    const walletRef = db.doc(`tokenWallets/${targetUid}`);
    const txRef = db.doc(`tokenTransactions/${txDocId('admin_adjustment', idempotencyKey)}`);
    let nextWallet: TokenWalletSummary = {
      uid: targetUid,
      available: 0,
      reserved: 0,
      lifetimePurchased: 0,
      lifetimeSpent: 0,
      lifetimeAdjusted: 0,
      updatedAt: serverTimestamp(),
    };

    await db.runTransaction(async (tx) => {
      const [walletSnap, ledgerSnap] = await Promise.all([
        tx.get(walletRef),
        tx.get(txRef),
      ]);

      if (ledgerSnap.exists) {
        const existingWalletSnap = await tx.get(walletRef);
        nextWallet = walletFromSnapshot(targetUid, existingWalletSnap);
        return;
      }

      const current = walletFromSnapshot(targetUid, walletSnap);
      const nextAvailable = current.available + delta;

      if (nextAvailable < 0) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Insufficient token balance for adjustment',
        );
      }

      nextWallet = {
        ...current,
        available: nextAvailable,
        lifetimeAdjusted: current.lifetimeAdjusted + delta,
        updatedAt: serverTimestamp(),
      };

      tx.set(walletRef, {
        available: nextWallet.available,
        reserved: nextWallet.reserved,
        lifetimePurchased: nextWallet.lifetimePurchased,
        lifetimeSpent: nextWallet.lifetimeSpent,
        lifetimeAdjusted: nextWallet.lifetimeAdjusted,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      tx.set(txRef, {
        uid: targetUid,
        type: 'admin_adjustment',
        actorType: 'admin',
        action: 'admin_adjustment',
        amount: delta,
        idempotencyKey,
        reason,
        metadata: {
          actorUid: adminUid,
          ...(data?.metadata || {}),
        },
        createdAt: serverTimestamp(),
      }, { merge: true });
    });

    await logAdminAction({
      adminId: adminUid,
      action: 'adjust_token_wallet_balance',
      targetUserId: targetUid,
      metadata: {
        delta,
        reason,
        idempotencyKey,
        resultingBalance: nextWallet.available,
      },
    });

    return nextWallet;
  },
);
//# sourceMappingURL=tokenWalletCommands.js.map