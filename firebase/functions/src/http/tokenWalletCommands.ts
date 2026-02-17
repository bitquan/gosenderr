import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
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

interface AdjustTokenWalletBalanceRequest {
  targetUid?: string;
  delta?: number;
  reason?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
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
    const txRef = db.doc(`tokenTransactions/${idempotencyKey}`);
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
      });
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
