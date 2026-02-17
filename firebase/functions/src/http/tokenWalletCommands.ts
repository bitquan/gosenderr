import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getStripeClient } from "../stripe/stripeSecrets";
import { logAdminAction, verifyAdmin } from "../utils/adminUtils";

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
  }>;
}

interface TokenWalletSummary {
  uid: string;
  available: number;
  reserved: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
  lifetimeAdjusted: number;
  updatedAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

interface TokenReserveRequest {
  action?: string;
  amount?: number;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  targetUid?: string;
}

interface TokenCommitRequest {
  reservationId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

interface TokenReleaseRequest {
  reservationId?: string;
  idempotencyKey?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

interface TokenRefundRequest {
  reservationId?: string;
  amount?: number;
  idempotencyKey?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
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

const DEFAULT_TOKEN_POLICY: TokenPolicy = {
  enabled: true,
  finalSale: true,
  tokenValueUsd: 1,
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
  packs: [],
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
      admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function getTokenPolicyInternal(): Promise<TokenPolicy> {
  const snap = await admin.firestore().doc("platformSettings/tokenPolicy").get();
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
    throw new functions.https.HttpsError("failed-precondition", errorMessage);
  }
}

export const getTokenPolicy = functions.https.onCall(async (_data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required",
    );
  }

  return getTokenPolicyInternal();
});

export const getTokenWalletSummary = functions.https.onCall(async (_data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required",
    );
  }

  const uid = context.auth.uid;
  const walletRef = admin.firestore().doc(`tokenWallets/${uid}`);
  const walletSnap = await walletRef.get();
  return walletFromSnapshot(uid, walletSnap);
});

export const tokenReserve = functions.https.onCall(
  async (data: TokenReserveRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const actorUid = context.auth.uid;
    const idempotencyKey = requireNonEmptyString(data?.idempotencyKey, "idempotencyKey");
    const action = requireNonEmptyString(data?.action, "action");
    const amount = normalizeNumber(data?.amount);
    const targetUid = data?.targetUid?.trim() || actorUid;

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new functions.https.HttpsError("invalid-argument", "amount must be a positive number");
    }

    const db = admin.firestore();
    const reservationRef = db.doc(`tokenReservations/${idempotencyKey}`);
    const txRef = db.doc(`tokenTransactions/${txDocId("reserve", idempotencyKey)}`);
    const walletRef = db.doc(`tokenWallets/${targetUid}`);

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
      ensureNonNegative(nextAvailable, "Insufficient token balance");

      wallet = {
        ...current,
        available: nextAvailable,
        reserved: current.reserved + amount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      tx.set(walletRef, {
        available: wallet.available,
        reserved: wallet.reserved,
        lifetimePurchased: wallet.lifetimePurchased,
        lifetimeSpent: wallet.lifetimeSpent,
        lifetimeAdjusted: wallet.lifetimeAdjusted,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(reservationRef, {
        uid: targetUid,
        action,
        amount,
        status: "reserved",
        idempotencyKey,
        metadata: data?.metadata || {},
        actorUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(txRef, {
        uid: targetUid,
        type: "reserve",
        actorType: "courier",
        action,
        amount,
        idempotencyKey,
        reservationId: idempotencyKey,
        metadata: data?.metadata || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return {
      reservationId: idempotencyKey,
      wallet,
    };
  },
);

export const tokenCommit = functions.https.onCall(
  async (data: TokenCommitRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const actorUid = context.auth.uid;
    const reservationId = requireNonEmptyString(data?.reservationId, "reservationId");
    const idempotencyKey = requireNonEmptyString(data?.idempotencyKey, "idempotencyKey");

    const db = admin.firestore();
    const reservationRef = db.doc(`tokenReservations/${reservationId}`);
    const txRef = db.doc(`tokenTransactions/${txDocId("commit", idempotencyKey)}`);

    let resultWallet: TokenWalletSummary | null = null;

    await db.runTransaction(async (tx) => {
      const [reservationSnap, txSnap] = await Promise.all([
        tx.get(reservationRef),
        tx.get(txRef),
      ]);

      if (txSnap.exists) {
        const existingReservation = await tx.get(reservationRef);
        const uid = (existingReservation.data()?.uid as string) || actorUid;
        const existingWallet = await tx.get(db.doc(`tokenWallets/${uid}`));
        resultWallet = walletFromSnapshot(uid, existingWallet);
        return;
      }

      if (!reservationSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Reservation not found");
      }

      const reservation = reservationSnap.data() as {
        uid: string;
        amount: number;
        action: string;
        status: string;
      };

      if (reservation.uid !== actorUid) {
        throw new functions.https.HttpsError("permission-denied", "Reservation owner mismatch");
      }

      if (reservation.status !== "reserved") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Reservation is ${reservation.status}, expected reserved`,
        );
      }

      const walletRef = db.doc(`tokenWallets/${reservation.uid}`);
      const walletSnap = await tx.get(walletRef);
      const current = walletFromSnapshot(reservation.uid, walletSnap);
      const nextReserved = current.reserved - reservation.amount;
      ensureNonNegative(nextReserved, "Reserved balance underflow");

      resultWallet = {
        ...current,
        reserved: nextReserved,
        lifetimeSpent: current.lifetimeSpent + reservation.amount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      tx.set(walletRef, {
        available: resultWallet.available,
        reserved: resultWallet.reserved,
        lifetimePurchased: resultWallet.lifetimePurchased,
        lifetimeSpent: resultWallet.lifetimeSpent,
        lifetimeAdjusted: resultWallet.lifetimeAdjusted,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(reservationRef, {
        status: "committed",
        committedAt: admin.firestore.FieldValue.serverTimestamp(),
        commitIdempotencyKey: idempotencyKey,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(txRef, {
        uid: reservation.uid,
        type: "commit",
        actorType: "courier",
        action: reservation.action,
        amount: reservation.amount,
        idempotencyKey,
        reservationId,
        metadata: data?.metadata || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return {
      reservationId,
      wallet: resultWallet,
    };
  },
);

export const tokenRelease = functions.https.onCall(
  async (data: TokenReleaseRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const actorUid = context.auth.uid;
    const reservationId = requireNonEmptyString(data?.reservationId, "reservationId");
    const idempotencyKey = requireNonEmptyString(data?.idempotencyKey, "idempotencyKey");

    const db = admin.firestore();
    const reservationRef = db.doc(`tokenReservations/${reservationId}`);
    const txRef = db.doc(`tokenTransactions/${txDocId("release", idempotencyKey)}`);

    let resultWallet: TokenWalletSummary | null = null;

    await db.runTransaction(async (tx) => {
      const [reservationSnap, txSnap] = await Promise.all([
        tx.get(reservationRef),
        tx.get(txRef),
      ]);

      if (txSnap.exists) {
        const existingReservation = await tx.get(reservationRef);
        const uid = (existingReservation.data()?.uid as string) || actorUid;
        const existingWallet = await tx.get(db.doc(`tokenWallets/${uid}`));
        resultWallet = walletFromSnapshot(uid, existingWallet);
        return;
      }

      if (!reservationSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Reservation not found");
      }

      const reservation = reservationSnap.data() as {
        uid: string;
        amount: number;
        action: string;
        status: string;
      };

      if (reservation.uid !== actorUid) {
        const isAdmin = await verifyAdmin(actorUid);
        if (!isAdmin) {
          throw new functions.https.HttpsError("permission-denied", "Reservation owner mismatch");
        }
      }

      if (reservation.status !== "reserved") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Reservation is ${reservation.status}, expected reserved`,
        );
      }

      const walletRef = db.doc(`tokenWallets/${reservation.uid}`);
      const walletSnap = await tx.get(walletRef);
      const current = walletFromSnapshot(reservation.uid, walletSnap);

      const nextReserved = current.reserved - reservation.amount;
      ensureNonNegative(nextReserved, "Reserved balance underflow");

      resultWallet = {
        ...current,
        available: current.available + reservation.amount,
        reserved: nextReserved,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      tx.set(walletRef, {
        available: resultWallet.available,
        reserved: resultWallet.reserved,
        lifetimePurchased: resultWallet.lifetimePurchased,
        lifetimeSpent: resultWallet.lifetimeSpent,
        lifetimeAdjusted: resultWallet.lifetimeAdjusted,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(reservationRef, {
        status: "released",
        releaseReason: data?.reason || "released",
        releaseIdempotencyKey: idempotencyKey,
        releasedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(txRef, {
        uid: reservation.uid,
        type: "release",
        actorType: "courier",
        action: reservation.action,
        amount: reservation.amount,
        idempotencyKey,
        reservationId,
        metadata: data?.metadata || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return {
      reservationId,
      wallet: resultWallet,
    };
  },
);

export const tokenRefund = functions.https.onCall(
  async (data: TokenRefundRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const actorUid = context.auth.uid;
    const idempotencyKey = requireNonEmptyString(data?.idempotencyKey, "idempotencyKey");
    const reservationId = requireNonEmptyString(data?.reservationId, "reservationId");

    const policy = await getTokenPolicyInternal();
    const isAdmin = await verifyAdmin(actorUid);
    if (policy.finalSale && !isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Refunds are disabled by token final-sale policy",
      );
    }

    const db = admin.firestore();
    const txRef = db.doc(`tokenTransactions/${txDocId("refund", idempotencyKey)}`);
    const reservationRef = db.doc(`tokenReservations/${reservationId}`);

    let walletResult: TokenWalletSummary | null = null;

    await db.runTransaction(async (tx) => {
      const [existingRefundSnap, reservationSnap] = await Promise.all([
        tx.get(txRef),
        tx.get(reservationRef),
      ]);

      if (existingRefundSnap.exists) {
        const reservationData = reservationSnap.data() as { uid?: string } | undefined;
        const uid = reservationData?.uid || actorUid;
        const walletSnap = await tx.get(db.doc(`tokenWallets/${uid}`));
        walletResult = walletFromSnapshot(uid, walletSnap);
        return;
      }

      if (!reservationSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Reservation not found");
      }

      const reservation = reservationSnap.data() as {
        uid: string;
        amount: number;
        action: string;
        status: string;
      };

      if (reservation.uid !== actorUid && !isAdmin) {
        throw new functions.https.HttpsError("permission-denied", "Refund owner mismatch");
      }

      if (reservation.status !== "committed") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Reservation is ${reservation.status}, expected committed`,
        );
      }

      const amount = data?.amount && data.amount > 0 ? data.amount : reservation.amount;

      const walletRef = db.doc(`tokenWallets/${reservation.uid}`);
      const walletSnap = await tx.get(walletRef);
      const current = walletFromSnapshot(reservation.uid, walletSnap);

      walletResult = {
        ...current,
        available: current.available + amount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      tx.set(walletRef, {
        available: walletResult.available,
        reserved: walletResult.reserved,
        lifetimePurchased: walletResult.lifetimePurchased,
        lifetimeSpent: walletResult.lifetimeSpent,
        lifetimeAdjusted: walletResult.lifetimeAdjusted,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(reservationRef, {
        status: "refunded",
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        refundIdempotencyKey: idempotencyKey,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(txRef, {
        uid: reservation.uid,
        type: "refund",
        actorType: isAdmin ? "admin" : "courier",
        action: reservation.action,
        amount,
        idempotencyKey,
        reservationId,
        reason: data?.reason || "policy_refund",
        metadata: data?.metadata || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return {
      reservationId,
      wallet: walletResult,
    };
  },
);

export const tokenCreateCheckoutSession = functions.https.onCall(
  async (data: TokenCreateCheckoutSessionRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const uid = context.auth.uid;
    const packId = requireNonEmptyString(data?.packId, "packId");
    const successUrl = requireNonEmptyString(data?.successUrl, "successUrl");
    const cancelUrl = requireNonEmptyString(data?.cancelUrl, "cancelUrl");
    const idempotencyKey = requireNonEmptyString(data?.idempotencyKey, "idempotencyKey");

    const policy = await getTokenPolicyInternal();
    if (!policy.enabled) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Token purchases are currently disabled",
      );
    }

    const selectedPack = policy.packs.find((pack) => pack.id === packId);
    if (!selectedPack) {
      throw new functions.https.HttpsError("not-found", "Requested token pack not found");
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

    const stripe = await getStripeClient();
    const lineItem = selectedPack.stripePriceId
      ? { price: selectedPack.stripePriceId, quantity: 1 }
      : {
          price_data: {
            currency: "usd",
            product_data: { name: `${selectedPack.tokens} Senderr tokens` },
            unit_amount: Math.round(selectedPack.priceUsd * 100),
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [lineItem],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: uid,
      metadata: {
        purchaseType: "token_purchase",
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
      paymentStatus: "pending",
      url: session.url || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return {
      sessionId: session.id,
      url: session.url,
    };
  },
);

export const adjustTokenWalletBalance = functions.https.onCall(
  async (data: AdjustTokenWalletBalanceRequest, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    const adminUid = context.auth.uid;
    const isAdmin = await verifyAdmin(adminUid);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin privileges required",
      );
    }

    const targetUid = data?.targetUid?.trim();
    const delta = normalizeNumber(data?.delta);
    const reason = data?.reason?.trim() || "admin_adjustment";
    const idempotencyKey = data?.idempotencyKey?.trim();

    if (!targetUid) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "targetUid is required",
      );
    }

    if (!idempotencyKey) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "idempotencyKey is required",
      );
    }

    if (!Number.isFinite(delta) || delta === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "delta must be a non-zero number",
      );
    }

    const db = admin.firestore();
    const walletRef = db.doc(`tokenWallets/${targetUid}`);
    const txRef = db.doc(`tokenTransactions/${txDocId("admin_adjustment", idempotencyKey)}`);
    let nextWallet: TokenWalletSummary = {
      uid: targetUid,
      available: 0,
      reserved: 0,
      lifetimePurchased: 0,
      lifetimeSpent: 0,
      lifetimeAdjusted: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
          "failed-precondition",
          "Insufficient token balance for adjustment",
        );
      }

      nextWallet = {
        ...current,
        available: nextAvailable,
        lifetimeAdjusted: current.lifetimeAdjusted + delta,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      tx.set(walletRef, {
        available: nextWallet.available,
        reserved: nextWallet.reserved,
        lifetimePurchased: nextWallet.lifetimePurchased,
        lifetimeSpent: nextWallet.lifetimeSpent,
        lifetimeAdjusted: nextWallet.lifetimeAdjusted,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(txRef, {
        uid: targetUid,
        type: "admin_adjustment",
        actorType: "admin",
        action: "admin_adjustment",
        amount: delta,
        idempotencyKey,
        reason,
        metadata: {
          actorUid: adminUid,
          ...(data?.metadata || {}),
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    await logAdminAction({
      adminId: adminUid,
      action: "adjust_token_wallet_balance",
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
