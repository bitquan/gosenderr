import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

const DEFAULT_SIGNUP_BONUS_TOKENS = 10;

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getSignupBonusTokens(): Promise<number> {
  try {
    const policySnap = await admin.firestore().doc("platformSettings/tokenPolicy").get();
    if (!policySnap.exists) {
      return DEFAULT_SIGNUP_BONUS_TOKENS;
    }

    const data = (policySnap.data() || {}) as { signupBonusTokens?: unknown };
    const configured = toNumber(data.signupBonusTokens);

    if (!Number.isFinite(configured) || configured < 0) {
      return DEFAULT_SIGNUP_BONUS_TOKENS;
    }

    return Math.floor(configured);
  } catch (error) {
    functions.logger.warn("Failed to load signup bonus token policy; using default", {
      error: error instanceof Error ? error.message : String(error),
    });
    return DEFAULT_SIGNUP_BONUS_TOKENS;
  }
}

export async function grantSignupBonusTokens(
  uid: string,
  source: "onAuthUserCreate" | "createUserForAdmin" | "runTestFlow" = "onAuthUserCreate",
): Promise<{ bonusTokens: number; granted: boolean; txId: string | null }> {
  const bonusTokens = await getSignupBonusTokens();
  if (bonusTokens <= 0) {
    return { bonusTokens, granted: false, txId: null };
  }

  const db = admin.firestore();
  const walletRef = db.doc(`tokenWallets/${uid}`);
  const txId = `signup_bonus_${uid}`;
  const transactionRef = db.doc(`tokenTransactions/${txId}`);
  const now = admin.firestore.FieldValue.serverTimestamp();

  let granted = false;

  await db.runTransaction(async (tx) => {
    const [walletSnap, transactionSnap] = await Promise.all([
      tx.get(walletRef),
      tx.get(transactionRef),
    ]);

    if (transactionSnap.exists) {
      return;
    }

    const walletData = walletSnap.exists ? (walletSnap.data() as Record<string, unknown>) : {};
    const available = toNumber(walletData.available);
    const reserved = toNumber(walletData.reserved);
    const lifetimePurchased = toNumber(walletData.lifetimePurchased);
    const lifetimeSpent = toNumber(walletData.lifetimeSpent);
    const lifetimeAdjusted = toNumber(walletData.lifetimeAdjusted);

    tx.set(
      walletRef,
      {
        available: available + bonusTokens,
        reserved,
        lifetimePurchased,
        lifetimeSpent,
        lifetimeAdjusted: lifetimeAdjusted + bonusTokens,
        updatedAt: now,
      },
      { merge: true },
    );

    tx.set(
      transactionRef,
      {
        uid,
        type: "admin_adjustment",
        actorType: "system",
        action: "signup_bonus",
        amount: bonusTokens,
        idempotencyKey: txId,
        metadata: {
          reason: "new_user_signup_bonus",
          source,
        },
        createdAt: now,
      },
      { merge: true },
    );

    granted = true;
  });

  return { bonusTokens, granted, txId };
}
