import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import type Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import { getStripeClient } from './stripeSecrets';

const db = admin.firestore();

type TokenTransactionType =
  | 'purchase'
  | 'reserve'
  | 'commit'
  | 'release'
  | 'refund'
  | 'admin_adjustment';

type TokenActorType = 'customer' | 'seller' | 'courier';

type TokenAction =
  | 'job_unlock'
  | 'listing_publish'
  | 'cash_fee'
  | 'ad_boost'
  | 'token_purchase'
  | 'admin_adjustment';

type TokenPayoutMode = 'stripe_connect' | 'external_provider' | 'manual_settlement';

interface TokenPack {
  id: string;
  name: string;
  tokens: number;
  priceUsd: number;
  active: boolean;
}

interface TokenPolicy {
  enabled: boolean;
  finalSale: boolean;
  tokenValueUsd: number;
  packs: TokenPack[];
  costs: {
    jobUnlockStandard: number;
    jobUnlockPriority: number;
    jobUnlockHeavy: number;
    listingPublish: number;
    cashFee: number;
    adBoost24h: number;
    adBoost7d: number;
    adBoost30d: number;
    adFeatured7d: number;
  };
  gating: {
    courierUnlockRequiresTokensWhenExternalPayout: boolean;
    sellerListingRequiresTokensWhenExternalPayout: boolean;
    customerCashFeeRequiresTokens: boolean;
    adsRequireTokens: boolean;
  };
}

interface TokenWallet {
  uid: string;
  available: number;
  reserved: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
  lifetimeAdjusted: number;
  updatedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

interface ReserveTokenData {
  actorType: TokenActorType;
  action: TokenAction;
  referenceId: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

interface CommitTokenData {
  reservationId: string;
  idempotencyKey: string;
}

interface ReleaseTokenData {
  reservationId: string;
  idempotencyKey: string;
}

interface ChargeTokenData {
  actorType: TokenActorType;
  action: TokenAction;
  referenceId: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

interface CreateTokenCheckoutSessionData {
  packId: string;
  idempotencyKey: string;
  actorType?: TokenActorType;
  successUrl?: string;
  cancelUrl?: string;
}

interface TokenClaimJobData {
  jobId: string;
  agreedFee: number;
  idempotencyKey: string;
}

interface TokenAdminAdjustData {
  uid: string;
  deltaTokens: number;
  action?: TokenAction;
  reason?: string;
  idempotencyKey: string;
}

const TOKEN_POLICY_DOC = 'platformSettings/tokenPolicy';
const TOKEN_WALLETS_COLLECTION = 'tokenWallets';
const TOKEN_TRANSACTIONS_COLLECTION = 'tokenTransactions';
const TOKEN_RESERVATIONS_COLLECTION = 'tokenReservations';
const TOKEN_PURCHASE_REQUESTS_COLLECTION = 'tokenPurchaseRequests';
const TOKEN_PURCHASE_SESSIONS_COLLECTION = 'tokenPurchaseSessions';
const USERS_COLLECTION = 'users';
const ADMIN_PROFILES_COLLECTION = 'adminProfiles';
const JOBS_COLLECTION = 'jobs';

const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9_-]{8,120}$/;

const DEFAULT_TOKEN_POLICY: TokenPolicy = {
  enabled: true,
  finalSale: true,
  tokenValueUsd: 0.1,
  packs: [
    { id: 'starter_100', name: 'Starter 100', tokens: 100, priceUsd: 10, active: true },
    { id: 'pro_250', name: 'Pro 250', tokens: 250, priceUsd: 25, active: true },
    { id: 'growth_600', name: 'Growth 600', tokens: 600, priceUsd: 60, active: true },
  ],
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
  gating: {
    courierUnlockRequiresTokensWhenExternalPayout: true,
    sellerListingRequiresTokensWhenExternalPayout: true,
    customerCashFeeRequiresTokens: true,
    adsRequireTokens: true,
  },
};

function toPositiveInteger(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed);
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function getWalletFromSnapshot(
  uid: string,
  snapshot: FirebaseFirestore.DocumentSnapshot,
): TokenWallet {
  const data = snapshot.exists ? snapshot.data() ?? {} : {};
  return {
    uid,
    available: toPositiveInteger(data.available, 0),
    reserved: toPositiveInteger(data.reserved, 0),
    lifetimePurchased: toPositiveInteger(data.lifetimePurchased, 0),
    lifetimeSpent: toPositiveInteger(data.lifetimeSpent, 0),
    lifetimeAdjusted: toNumber(data.lifetimeAdjusted, 0),
  };
}

function assertIdempotencyKey(idempotencyKey: string): void {
  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'idempotencyKey must be 8-120 chars using letters, numbers, underscores, or hyphens',
    );
  }
}

function safeDocKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 220);
}

function parseActorType(value: unknown, fallback: TokenActorType): TokenActorType {
  if (value === 'customer' || value === 'seller' || value === 'courier') {
    return value;
  }
  return fallback;
}

function parseAction(value: unknown): TokenAction {
  if (
    value === 'job_unlock' ||
    value === 'listing_publish' ||
    value === 'cash_fee' ||
    value === 'ad_boost' ||
    value === 'token_purchase' ||
    value === 'admin_adjustment'
  ) {
    return value;
  }
  throw new functions.https.HttpsError('invalid-argument', 'Unsupported token action');
}

function parsePayoutMode(value: unknown): TokenPayoutMode {
  if (value === 'external_provider' || value === 'manual_settlement' || value === 'stripe_connect') {
    return value;
  }
  return 'stripe_connect';
}

function isExternalPayoutMode(mode: TokenPayoutMode): boolean {
  return mode === 'external_provider' || mode === 'manual_settlement';
}

function parsePolicy(raw: Record<string, unknown> | undefined): TokenPolicy {
  if (!raw) return DEFAULT_TOKEN_POLICY;

  const packs = Array.isArray(raw.packs)
    ? raw.packs
        .map((pack) => {
          if (!pack || typeof pack !== 'object') return null;
          const p = pack as Record<string, unknown>;
          const id = typeof p.id === 'string' ? p.id : null;
          const name = typeof p.name === 'string' ? p.name : null;
          const tokens = toPositiveInteger(p.tokens, 0);
          const priceUsd = toNumber(p.priceUsd, 0);
          const active = p.active !== false;
          if (!id || !name || tokens <= 0 || priceUsd <= 0) return null;
          return { id, name, tokens, priceUsd, active } as TokenPack;
        })
        .filter((pack): pack is TokenPack => Boolean(pack))
    : DEFAULT_TOKEN_POLICY.packs;

  const costsRaw =
    raw.costs && typeof raw.costs === 'object'
      ? (raw.costs as Record<string, unknown>)
      : DEFAULT_TOKEN_POLICY.costs;

  const gatingRaw =
    raw.gating && typeof raw.gating === 'object'
      ? (raw.gating as Record<string, unknown>)
      : DEFAULT_TOKEN_POLICY.gating;

  return {
    enabled: raw.enabled !== false,
    finalSale: raw.finalSale !== false,
    tokenValueUsd: toNumber(raw.tokenValueUsd, DEFAULT_TOKEN_POLICY.tokenValueUsd),
    packs: packs.length > 0 ? packs : DEFAULT_TOKEN_POLICY.packs,
    costs: {
      jobUnlockStandard: toPositiveInteger(
        costsRaw.jobUnlockStandard,
        DEFAULT_TOKEN_POLICY.costs.jobUnlockStandard,
      ),
      jobUnlockPriority: toPositiveInteger(
        costsRaw.jobUnlockPriority,
        DEFAULT_TOKEN_POLICY.costs.jobUnlockPriority,
      ),
      jobUnlockHeavy: toPositiveInteger(
        costsRaw.jobUnlockHeavy,
        DEFAULT_TOKEN_POLICY.costs.jobUnlockHeavy,
      ),
      listingPublish: toPositiveInteger(costsRaw.listingPublish, DEFAULT_TOKEN_POLICY.costs.listingPublish),
      cashFee: toPositiveInteger(costsRaw.cashFee, DEFAULT_TOKEN_POLICY.costs.cashFee),
      adBoost24h: toPositiveInteger(costsRaw.adBoost24h, DEFAULT_TOKEN_POLICY.costs.adBoost24h),
      adBoost7d: toPositiveInteger(costsRaw.adBoost7d, DEFAULT_TOKEN_POLICY.costs.adBoost7d),
      adBoost30d: toPositiveInteger(costsRaw.adBoost30d, DEFAULT_TOKEN_POLICY.costs.adBoost30d),
      adFeatured7d: toPositiveInteger(costsRaw.adFeatured7d, DEFAULT_TOKEN_POLICY.costs.adFeatured7d),
    },
    gating: {
      courierUnlockRequiresTokensWhenExternalPayout:
        gatingRaw.courierUnlockRequiresTokensWhenExternalPayout !== false,
      sellerListingRequiresTokensWhenExternalPayout:
        gatingRaw.sellerListingRequiresTokensWhenExternalPayout !== false,
      customerCashFeeRequiresTokens: gatingRaw.customerCashFeeRequiresTokens !== false,
      adsRequireTokens: gatingRaw.adsRequireTokens !== false,
    },
  };
}

async function getTokenPolicy(): Promise<TokenPolicy> {
  const policySnapshot = await db.doc(TOKEN_POLICY_DOC).get();
  const raw = policySnapshot.exists ? (policySnapshot.data() as Record<string, unknown>) : undefined;
  return parsePolicy(raw);
}

async function getUserDoc(uid: string): Promise<Record<string, unknown>> {
  const userSnapshot = await db.collection(USERS_COLLECTION).doc(uid).get();
  return (userSnapshot.exists ? userSnapshot.data() : {}) as Record<string, unknown>;
}

function getUserPayoutMode(userData: Record<string, unknown>, actorType: TokenActorType): TokenPayoutMode {
  if (actorType === 'seller') {
    const profile = (userData.sellerProfile || {}) as Record<string, unknown>;
    return parsePayoutMode(profile.payoutMode ?? profile.sellerPayoutMode);
  }

  if (actorType === 'courier') {
    const profile = (userData.courierProfile || {}) as Record<string, unknown>;
    return parsePayoutMode(profile.payoutMode ?? profile.courierPayoutMode);
  }

  return 'stripe_connect';
}

function resolveActionTokenCost(
  policy: TokenPolicy,
  action: TokenAction,
  metadata: Record<string, unknown> | undefined,
): number {
  if (!policy.enabled) return 0;

  if (action === 'job_unlock') {
    const tier = typeof metadata?.tier === 'string' ? metadata.tier : 'standard';
    if (tier === 'heavy') return policy.costs.jobUnlockHeavy;
    if (tier === 'priority') return policy.costs.jobUnlockPriority;
    return policy.costs.jobUnlockStandard;
  }

  if (action === 'listing_publish') return policy.costs.listingPublish;
  if (action === 'cash_fee') return policy.costs.cashFee;

  if (action === 'ad_boost') {
    const placement = typeof metadata?.placement === 'string' ? metadata.placement : 'boost';
    const durationDays = toPositiveInteger(metadata?.durationDays, 1);
    if (placement === 'featured' && durationDays >= 7) {
      return policy.costs.adFeatured7d;
    }
    if (durationDays >= 30) return policy.costs.adBoost30d;
    if (durationDays >= 7) return policy.costs.adBoost7d;
    return policy.costs.adBoost24h;
  }

  return 0;
}

function actionRequiresExternalPayoutGate(policy: TokenPolicy, actorType: TokenActorType, action: TokenAction): boolean {
  if (actorType === 'courier' && action === 'job_unlock') {
    return policy.gating.courierUnlockRequiresTokensWhenExternalPayout;
  }
  if (actorType === 'seller' && action === 'listing_publish') {
    return policy.gating.sellerListingRequiresTokensWhenExternalPayout;
  }
  return false;
}

function actionRequiresTokenWithoutPayoutGate(policy: TokenPolicy, action: TokenAction): boolean {
  if (action === 'cash_fee') return policy.gating.customerCashFeeRequiresTokens;
  if (action === 'ad_boost') return policy.gating.adsRequireTokens;
  return false;
}

async function resolveRequiredTokens(
  uid: string,
  actorType: TokenActorType,
  action: TokenAction,
  metadata: Record<string, unknown> | undefined,
): Promise<{ requiredTokens: number; payoutMode: TokenPayoutMode; policy: TokenPolicy }> {
  const policy = await getTokenPolicy();
  const cost = resolveActionTokenCost(policy, action, metadata);
  if (cost <= 0) {
    return { requiredTokens: 0, payoutMode: 'stripe_connect', policy };
  }

  const userData = await getUserDoc(uid);
  const payoutMode = getUserPayoutMode(userData, actorType);

  const gatedByPayoutMode = actionRequiresExternalPayoutGate(policy, actorType, action);
  const requiresTokens =
    (gatedByPayoutMode && isExternalPayoutMode(payoutMode)) ||
    actionRequiresTokenWithoutPayoutGate(policy, action);

  return {
    requiredTokens: requiresTokens ? cost : 0,
    payoutMode,
    policy,
  };
}

function ensureSignedIn(
  auth: functions.https.CallableRequest<unknown>['auth'],
): string {
  if (!auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
  return auth.uid;
}

async function isAdmin(uid: string): Promise<boolean> {
  const [profileDoc, userDoc] = await Promise.all([
    db.collection(ADMIN_PROFILES_COLLECTION).doc(uid).get(),
    db.collection(USERS_COLLECTION).doc(uid).get(),
  ]);

  if (profileDoc.exists) return true;

  const role = userDoc.exists ? (userDoc.data()?.role as string | undefined) : undefined;
  return role === 'admin';
}

function normalizeCheckoutUrl(url: unknown, fallbackOrigin: string): string {
  if (typeof url !== 'string' || !url.trim()) {
    return fallbackOrigin;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return fallbackOrigin;
    }
    return parsed.toString();
  } catch {
    return fallbackOrigin;
  }
}

async function writeTokenTransaction(payload: {
  actorUid: string;
  actorType: TokenActorType;
  type: TokenTransactionType;
  action: TokenAction;
  tokens: number;
  referenceId?: string;
  reservationId?: string;
  idempotencyKey: string;
  notes?: string;
  txId?: string;
  extra?: Record<string, unknown>;
}): Promise<string> {
  const txRef = payload.txId
    ? db.collection(TOKEN_TRANSACTIONS_COLLECTION).doc(payload.txId)
    : db.collection(TOKEN_TRANSACTIONS_COLLECTION).doc();

  const now = FieldValue.serverTimestamp();

  await txRef.set({
    actorUid: payload.actorUid,
    actorType: payload.actorType,
    type: payload.type,
    action: payload.action,
    tokens: payload.tokens,
    referenceId: payload.referenceId || null,
    reservationId: payload.reservationId || null,
    idempotencyKey: payload.idempotencyKey,
    notes: payload.notes || null,
    createdAt: now,
    ...payload.extra,
  }, { merge: false });

  return txRef.id;
}

export const tokenGetWallet = functions.https.onCall(
  { cors: true },
  async (request) => {
    const uid = ensureSignedIn(request.auth);
    const [walletSnapshot, policy] = await Promise.all([
      db.collection(TOKEN_WALLETS_COLLECTION).doc(uid).get(),
      getTokenPolicy(),
    ]);

    const wallet = getWalletFromSnapshot(uid, walletSnapshot);

    return {
      wallet,
      policy,
    };
  },
);

export const tokenReserveAction = functions.https.onCall<ReserveTokenData>(
  { cors: true },
  async (request) => {
    const uid = ensureSignedIn(request.auth);
    const actorType = parseActorType(request.data.actorType, 'customer');
    const action = parseAction(request.data.action);
    const referenceId = String(request.data.referenceId || '').trim();
    const idempotencyKey = String(request.data.idempotencyKey || '').trim();
    const metadata =
      request.data.metadata && typeof request.data.metadata === 'object'
        ? (request.data.metadata as Record<string, unknown>)
        : undefined;

    if (!referenceId) {
      throw new functions.https.HttpsError('invalid-argument', 'referenceId is required');
    }

    assertIdempotencyKey(idempotencyKey);

    const { requiredTokens, payoutMode } = await resolveRequiredTokens(uid, actorType, action, metadata);
    if (requiredTokens <= 0) {
      const walletSnapshot = await db.collection(TOKEN_WALLETS_COLLECTION).doc(uid).get();
      const wallet = getWalletFromSnapshot(uid, walletSnapshot);
      return {
        status: 'not_required',
        reservationId: null,
        requiredTokens: 0,
        payoutMode,
        wallet,
      };
    }

    const reservationId = `${safeDocKey(uid)}_${safeDocKey(idempotencyKey)}`;
    const reservationRef = db.collection(TOKEN_RESERVATIONS_COLLECTION).doc(reservationId);
    const walletRef = db.collection(TOKEN_WALLETS_COLLECTION).doc(uid);

    const result = await db.runTransaction(async (transaction) => {
      const [reservationSnapshot, walletSnapshot] = await Promise.all([
        transaction.get(reservationRef),
        transaction.get(walletRef),
      ]);

      if (reservationSnapshot.exists) {
        const reservationData = reservationSnapshot.data() as Record<string, unknown>;
        if (reservationData.actorUid !== uid) {
          throw new functions.https.HttpsError('permission-denied', 'Reservation does not belong to user');
        }

        return {
          status: String(reservationData.status || 'reserved'),
          requiredTokens: toPositiveInteger(reservationData.tokens, requiredTokens),
          wallet: getWalletFromSnapshot(uid, walletSnapshot),
        };
      }

      const wallet = getWalletFromSnapshot(uid, walletSnapshot);
      if (wallet.available < requiredTokens) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Not enough tokens. Required ${requiredTokens}, available ${wallet.available}`,
        );
      }

      transaction.set(walletRef, {
        uid,
        available: wallet.available - requiredTokens,
        reserved: wallet.reserved + requiredTokens,
        lifetimePurchased: wallet.lifetimePurchased,
        lifetimeSpent: wallet.lifetimeSpent,
        lifetimeAdjusted: wallet.lifetimeAdjusted,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      transaction.set(reservationRef, {
        id: reservationId,
        actorUid: uid,
        actorType,
        action,
        tokens: requiredTokens,
        referenceId,
        metadata: metadata || null,
        idempotencyKey,
        status: 'reserved',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: false });

      transaction.set(db.collection(TOKEN_TRANSACTIONS_COLLECTION).doc(), {
        actorUid: uid,
        actorType,
        type: 'reserve',
        action,
        tokens: requiredTokens,
        referenceId,
        reservationId,
        idempotencyKey,
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: false });

      return {
        status: 'reserved',
        requiredTokens,
        wallet: {
          ...wallet,
          available: wallet.available - requiredTokens,
          reserved: wallet.reserved + requiredTokens,
        },
      };
    });

    return {
      status: result.status,
      reservationId,
      requiredTokens: result.requiredTokens,
      payoutMode,
      wallet: result.wallet,
    };
  },
);

export const tokenCommitAction = functions.https.onCall<CommitTokenData>(
  { cors: true },
  async (request) => {
    const uid = ensureSignedIn(request.auth);
    const reservationId = String(request.data.reservationId || '').trim();
    const idempotencyKey = String(request.data.idempotencyKey || '').trim();
    assertIdempotencyKey(idempotencyKey);

    if (!reservationId) {
      throw new functions.https.HttpsError('invalid-argument', 'reservationId is required');
    }

    const reservationRef = db.collection(TOKEN_RESERVATIONS_COLLECTION).doc(reservationId);
    const walletRef = db.collection(TOKEN_WALLETS_COLLECTION).doc(uid);
    const commitTxId = `commit_${safeDocKey(uid)}_${safeDocKey(idempotencyKey)}`;
    const commitTxRef = db.collection(TOKEN_TRANSACTIONS_COLLECTION).doc(commitTxId);

    const result = await db.runTransaction(async (transaction) => {
      const [reservationSnapshot, walletSnapshot, commitSnapshot] = await Promise.all([
        transaction.get(reservationRef),
        transaction.get(walletRef),
        transaction.get(commitTxRef),
      ]);

      if (commitSnapshot.exists) {
        const wallet = getWalletFromSnapshot(uid, walletSnapshot);
        return { status: 'committed', wallet };
      }

      if (!reservationSnapshot.exists) {
        throw new functions.https.HttpsError('not-found', 'Reservation not found');
      }

      const reservation = reservationSnapshot.data() as Record<string, unknown>;
      if (reservation.actorUid !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'Reservation does not belong to user');
      }

      const status = String(reservation.status || 'reserved');
      const tokens = toPositiveInteger(reservation.tokens, 0);

      if (status === 'released') {
        throw new functions.https.HttpsError('failed-precondition', 'Reservation already released');
      }

      if (status === 'committed') {
        return { status: 'committed', wallet: getWalletFromSnapshot(uid, walletSnapshot) };
      }

      const wallet = getWalletFromSnapshot(uid, walletSnapshot);
      if (wallet.reserved < tokens) {
        throw new functions.https.HttpsError('failed-precondition', 'Reserved token balance is inconsistent');
      }

      const nextWallet = {
        ...wallet,
        reserved: wallet.reserved - tokens,
        lifetimeSpent: wallet.lifetimeSpent + tokens,
      };

      transaction.set(walletRef, {
        uid,
        available: nextWallet.available,
        reserved: nextWallet.reserved,
        lifetimePurchased: nextWallet.lifetimePurchased,
        lifetimeSpent: nextWallet.lifetimeSpent,
        lifetimeAdjusted: nextWallet.lifetimeAdjusted,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      transaction.update(reservationRef, {
        status: 'committed',
        committedAt: FieldValue.serverTimestamp(),
        commitIdempotencyKey: idempotencyKey,
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.set(commitTxRef, {
        actorUid: uid,
        actorType: reservation.actorType,
        type: 'commit',
        action: reservation.action,
        tokens,
        referenceId: reservation.referenceId || null,
        reservationId,
        idempotencyKey,
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: false });

      return { status: 'committed', wallet: nextWallet };
    });

    return result;
  },
);

export const tokenReleaseAction = functions.https.onCall<ReleaseTokenData>(
  { cors: true },
  async (request) => {
    const uid = ensureSignedIn(request.auth);
    const reservationId = String(request.data.reservationId || '').trim();
    const idempotencyKey = String(request.data.idempotencyKey || '').trim();
    assertIdempotencyKey(idempotencyKey);

    if (!reservationId) {
      throw new functions.https.HttpsError('invalid-argument', 'reservationId is required');
    }

    const reservationRef = db.collection(TOKEN_RESERVATIONS_COLLECTION).doc(reservationId);
    const walletRef = db.collection(TOKEN_WALLETS_COLLECTION).doc(uid);
    const releaseTxId = `release_${safeDocKey(uid)}_${safeDocKey(idempotencyKey)}`;
    const releaseTxRef = db.collection(TOKEN_TRANSACTIONS_COLLECTION).doc(releaseTxId);

    const result = await db.runTransaction(async (transaction) => {
      const [reservationSnapshot, walletSnapshot, releaseSnapshot] = await Promise.all([
        transaction.get(reservationRef),
        transaction.get(walletRef),
        transaction.get(releaseTxRef),
      ]);

      if (releaseSnapshot.exists) {
        return { status: 'released', wallet: getWalletFromSnapshot(uid, walletSnapshot) };
      }

      if (!reservationSnapshot.exists) {
        throw new functions.https.HttpsError('not-found', 'Reservation not found');
      }

      const reservation = reservationSnapshot.data() as Record<string, unknown>;
      if (reservation.actorUid !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'Reservation does not belong to user');
      }

      const status = String(reservation.status || 'reserved');
      const tokens = toPositiveInteger(reservation.tokens, 0);

      if (status === 'committed') {
        throw new functions.https.HttpsError('failed-precondition', 'Reservation already committed');
      }

      if (status === 'released') {
        return { status: 'released', wallet: getWalletFromSnapshot(uid, walletSnapshot) };
      }

      const wallet = getWalletFromSnapshot(uid, walletSnapshot);
      const nextWallet = {
        ...wallet,
        available: wallet.available + tokens,
        reserved: Math.max(0, wallet.reserved - tokens),
      };

      transaction.set(walletRef, {
        uid,
        available: nextWallet.available,
        reserved: nextWallet.reserved,
        lifetimePurchased: nextWallet.lifetimePurchased,
        lifetimeSpent: nextWallet.lifetimeSpent,
        lifetimeAdjusted: nextWallet.lifetimeAdjusted,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      transaction.update(reservationRef, {
        status: 'released',
        releasedAt: FieldValue.serverTimestamp(),
        releaseIdempotencyKey: idempotencyKey,
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.set(releaseTxRef, {
        actorUid: uid,
        actorType: reservation.actorType,
        type: 'release',
        action: reservation.action,
        tokens,
        referenceId: reservation.referenceId || null,
        reservationId,
        idempotencyKey,
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: false });

      return { status: 'released', wallet: nextWallet };
    });

    return result;
  },
);

export const tokenChargeAction = functions.https.onCall<ChargeTokenData>(
  { cors: true },
  async (request) => {
    const uid = ensureSignedIn(request.auth);
    const actorType = parseActorType(request.data.actorType, 'customer');
    const action = parseAction(request.data.action);
    const referenceId = String(request.data.referenceId || '').trim();
    const idempotencyKey = String(request.data.idempotencyKey || '').trim();
    const metadata =
      request.data.metadata && typeof request.data.metadata === 'object'
        ? (request.data.metadata as Record<string, unknown>)
        : undefined;

    if (!referenceId) {
      throw new functions.https.HttpsError('invalid-argument', 'referenceId is required');
    }
    assertIdempotencyKey(idempotencyKey);

    const commitTxId = `charge_${safeDocKey(uid)}_${safeDocKey(idempotencyKey)}`;
    const commitTxRef = db.collection(TOKEN_TRANSACTIONS_COLLECTION).doc(commitTxId);
    const walletRef = db.collection(TOKEN_WALLETS_COLLECTION).doc(uid);

    const { requiredTokens, payoutMode } = await resolveRequiredTokens(uid, actorType, action, metadata);

    if (requiredTokens <= 0) {
      const walletSnapshot = await walletRef.get();
      return {
        status: 'not_required',
        tokensCharged: 0,
        payoutMode,
        wallet: getWalletFromSnapshot(uid, walletSnapshot),
      };
    }

    const result = await db.runTransaction(async (transaction) => {
      const [existingCommitSnapshot, walletSnapshot] = await Promise.all([
        transaction.get(commitTxRef),
        transaction.get(walletRef),
      ]);

      if (existingCommitSnapshot.exists) {
        return {
          status: 'charged',
          tokensCharged: requiredTokens,
          wallet: getWalletFromSnapshot(uid, walletSnapshot),
        };
      }

      const wallet = getWalletFromSnapshot(uid, walletSnapshot);
      if (wallet.available < requiredTokens) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Not enough tokens. Required ${requiredTokens}, available ${wallet.available}`,
        );
      }

      const nextWallet = {
        ...wallet,
        available: wallet.available - requiredTokens,
        lifetimeSpent: wallet.lifetimeSpent + requiredTokens,
      };

      transaction.set(walletRef, {
        uid,
        available: nextWallet.available,
        reserved: nextWallet.reserved,
        lifetimePurchased: nextWallet.lifetimePurchased,
        lifetimeSpent: nextWallet.lifetimeSpent,
        lifetimeAdjusted: nextWallet.lifetimeAdjusted,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      transaction.set(commitTxRef, {
        actorUid: uid,
        actorType,
        type: 'commit',
        action,
        tokens: requiredTokens,
        referenceId,
        reservationId: null,
        idempotencyKey,
        metadata: metadata || null,
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: false });

      return {
        status: 'charged',
        tokensCharged: requiredTokens,
        wallet: nextWallet,
      };
    });

    return {
      ...result,
      payoutMode,
    };
  },
);

export const tokenClaimJob = functions.https.onCall<TokenClaimJobData>(
  { cors: true },
  async (request) => {
    const uid = ensureSignedIn(request.auth);
    const jobId = String(request.data.jobId || '').trim();
    const agreedFee = toNumber(request.data.agreedFee, 0);
    const idempotencyKey = String(request.data.idempotencyKey || '').trim();

    if (!jobId) {
      throw new functions.https.HttpsError('invalid-argument', 'jobId is required');
    }
    if (!Number.isFinite(agreedFee) || agreedFee <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'agreedFee must be greater than 0');
    }
    assertIdempotencyKey(idempotencyKey);

    const userData = await getUserDoc(uid);
    const payoutMode = getUserPayoutMode(userData, 'courier');
    const policy = await getTokenPolicy();

    const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);
    const walletRef = db.collection(TOKEN_WALLETS_COLLECTION).doc(uid);
    const commitTxId = `jobclaim_${safeDocKey(uid)}_${safeDocKey(idempotencyKey)}`;
    const commitTxRef = db.collection(TOKEN_TRANSACTIONS_COLLECTION).doc(commitTxId);

    const result = await db.runTransaction(async (transaction) => {
      const [jobSnapshot, walletSnapshot, existingCommitSnapshot] = await Promise.all([
        transaction.get(jobRef),
        transaction.get(walletRef),
        transaction.get(commitTxRef),
      ]);

      if (!jobSnapshot.exists) {
        throw new functions.https.HttpsError('not-found', 'Job not found');
      }

      const jobData = jobSnapshot.data() as Record<string, unknown>;

      if (existingCommitSnapshot.exists) {
        return {
          status: 'claimed',
          tokensCharged: toPositiveInteger(existingCommitSnapshot.data()?.tokens, 0),
          jobId,
          payoutMode,
        };
      }

      const status = String(jobData.status || '');
      const existingCourierUid = jobData.courierUid;

      if (status !== 'open' || existingCourierUid !== null) {
        throw new functions.https.HttpsError('failed-precondition', 'Job already claimed or unavailable');
      }

      const metadata: Record<string, unknown> = {};
      const packageData = (jobData.package || {}) as Record<string, unknown>;
      const packageSize = String(packageData.size || '').toLowerCase();
      if (packageSize.includes('xl') || packageSize.includes('extra') || packageSize.includes('large')) {
        metadata.tier = 'heavy';
      } else {
        metadata.tier = 'standard';
      }

      const requiresTokens =
        policy.gating.courierUnlockRequiresTokensWhenExternalPayout && isExternalPayoutMode(payoutMode);
      const requiredTokens = requiresTokens
        ? resolveActionTokenCost(policy, 'job_unlock', metadata)
        : 0;

      if (requiredTokens > 0) {
        const wallet = getWalletFromSnapshot(uid, walletSnapshot);
        if (wallet.available < requiredTokens) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            `Not enough tokens to unlock this job. Required ${requiredTokens}, available ${wallet.available}`,
          );
        }

        transaction.set(walletRef, {
          uid,
          available: wallet.available - requiredTokens,
          reserved: wallet.reserved,
          lifetimePurchased: wallet.lifetimePurchased,
          lifetimeSpent: wallet.lifetimeSpent + requiredTokens,
          lifetimeAdjusted: wallet.lifetimeAdjusted,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      transaction.update(jobRef, {
        courierUid: uid,
        agreedFee,
        status: 'assigned',
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (requiredTokens > 0) {
        transaction.set(commitTxRef, {
          actorUid: uid,
          actorType: 'courier',
          type: 'commit',
          action: 'job_unlock',
          tokens: requiredTokens,
          referenceId: jobId,
          reservationId: null,
          idempotencyKey,
          createdAt: FieldValue.serverTimestamp(),
        }, { merge: false });
      }

      return {
        status: 'claimed',
        tokensCharged: requiredTokens,
        jobId,
        payoutMode,
      };
    });

    return result;
  },
);

export const tokenCreateCheckoutSession = functions.https.onCall<CreateTokenCheckoutSessionData>(
  { cors: true },
  async (request) => {
    const uid = ensureSignedIn(request.auth);
    const actorType = parseActorType(request.data.actorType, 'customer');
    const packId = String(request.data.packId || '').trim();
    const idempotencyKey = String(request.data.idempotencyKey || '').trim();
    assertIdempotencyKey(idempotencyKey);

    if (!packId) {
      throw new functions.https.HttpsError('invalid-argument', 'packId is required');
    }

    const policy = await getTokenPolicy();
    const pack = policy.packs.find((candidate) => candidate.id === packId && candidate.active);

    if (!pack) {
      throw new functions.https.HttpsError('invalid-argument', 'Unknown or inactive token pack');
    }

    const requestId = `${safeDocKey(uid)}_${safeDocKey(idempotencyKey)}`;
    const requestRef = db.collection(TOKEN_PURCHASE_REQUESTS_COLLECTION).doc(requestId);
    const existingRequest = await requestRef.get();
    if (existingRequest.exists) {
      const data = existingRequest.data() as Record<string, unknown>;
      const existingUrl = typeof data.checkoutUrl === 'string' ? data.checkoutUrl : '';
      const existingSessionId = typeof data.sessionId === 'string' ? data.sessionId : '';
      if (existingUrl && existingSessionId) {
        return {
          sessionId: existingSessionId,
          checkoutUrl: existingUrl,
          pack,
          idempotent: true,
        };
      }
    }

    const fallbackOrigin =
      typeof request.rawRequest.headers.origin === 'string'
        ? request.rawRequest.headers.origin
        : 'http://localhost:5173';

    const successUrl = normalizeCheckoutUrl(request.data.successUrl, `${fallbackOrigin}/settings?tokens=success`);
    const cancelUrl = normalizeCheckoutUrl(request.data.cancelUrl, `${fallbackOrigin}/settings?tokens=cancelled`);

    const stripe = await getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Senderr Tokens • ${pack.name}`,
              description: `${pack.tokens} tokens for platform actions`,
            },
            unit_amount: Math.round(pack.priceUsd * 100),
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        kind: 'token_purchase',
        actorUid: uid,
        actorType,
        packId: pack.id,
        tokens: String(pack.tokens),
        idempotencyKey,
        requestId,
      },
    });

    await requestRef.set({
      actorUid: uid,
      actorType,
      idempotencyKey,
      packId: pack.id,
      tokens: pack.tokens,
      sessionId: session.id,
      checkoutUrl: session.url,
      status: 'created',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection(TOKEN_PURCHASE_SESSIONS_COLLECTION).doc(session.id).set({
      actorUid: uid,
      actorType,
      idempotencyKey,
      requestId,
      packId: pack.id,
      tokens: pack.tokens,
      status: 'created',
      checkoutUrl: session.url,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
      pack,
      idempotent: false,
    };
  },
);

export async function creditTokensFromCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  const metadata = (session.metadata || {}) as Record<string, string>;
  if (metadata.kind !== 'token_purchase') {
    return;
  }

  const actorUid = String(metadata.actorUid || '').trim();
  const actorType = parseActorType(metadata.actorType, 'customer');
  const tokens = toPositiveInteger(metadata.tokens, 0);
  const packId = String(metadata.packId || '').trim();
  const idempotencyKey = String(metadata.idempotencyKey || '').trim();
  const requestId = String(metadata.requestId || '').trim();

  if (!actorUid || tokens <= 0 || !packId) {
    console.error('Token purchase webhook metadata invalid', { sessionId: session.id, metadata });
    return;
  }

  const walletRef = db.collection(TOKEN_WALLETS_COLLECTION).doc(actorUid);
  const purchaseTxId = `purchase_${safeDocKey(session.id)}`;
  const purchaseTxRef = db.collection(TOKEN_TRANSACTIONS_COLLECTION).doc(purchaseTxId);

  await db.runTransaction(async (transaction) => {
    const [walletSnapshot, purchaseSnapshot] = await Promise.all([
      transaction.get(walletRef),
      transaction.get(purchaseTxRef),
    ]);

    if (purchaseSnapshot.exists) {
      return;
    }

    const wallet = getWalletFromSnapshot(actorUid, walletSnapshot);

    transaction.set(walletRef, {
      uid: actorUid,
      available: wallet.available + tokens,
      reserved: wallet.reserved,
      lifetimePurchased: wallet.lifetimePurchased + tokens,
      lifetimeSpent: wallet.lifetimeSpent,
      lifetimeAdjusted: wallet.lifetimeAdjusted,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(purchaseTxRef, {
      actorUid,
      actorType,
      type: 'purchase',
      action: 'token_purchase',
      tokens,
      referenceId: session.id,
      reservationId: null,
      idempotencyKey: idempotencyKey || `stripe_session_${session.id}`,
      stripeSessionId: session.id,
      packId,
      amountTotal: session.amount_total || null,
      currency: session.currency || 'usd',
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: false });
  });

  const purchaseSessionRef = db.collection(TOKEN_PURCHASE_SESSIONS_COLLECTION).doc(session.id);
  await purchaseSessionRef.set({
    actorUid,
    actorType,
    requestId: requestId || null,
    status: 'completed',
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  if (requestId) {
    await db.collection(TOKEN_PURCHASE_REQUESTS_COLLECTION).doc(requestId).set({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
}

export const tokenAdminAdjustBalance = functions.https.onCall<TokenAdminAdjustData>(
  { cors: true },
  async (request) => {
    const actorUid = ensureSignedIn(request.auth);
    const actorIsAdmin = await isAdmin(actorUid);
    if (!actorIsAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
    }

    const uid = String(request.data.uid || '').trim();
    const deltaTokens = Math.round(toNumber(request.data.deltaTokens, 0));
    const idempotencyKey = String(request.data.idempotencyKey || '').trim();
    const reason = String(request.data.reason || '').trim();
    const action = request.data.action ? parseAction(request.data.action) : 'admin_adjustment';

    if (!uid) {
      throw new functions.https.HttpsError('invalid-argument', 'uid is required');
    }
    if (!deltaTokens) {
      throw new functions.https.HttpsError('invalid-argument', 'deltaTokens must be non-zero');
    }

    assertIdempotencyKey(idempotencyKey);

    const walletRef = db.collection(TOKEN_WALLETS_COLLECTION).doc(uid);
    const txId = `adminadj_${safeDocKey(uid)}_${safeDocKey(idempotencyKey)}`;
    const txRef = db.collection(TOKEN_TRANSACTIONS_COLLECTION).doc(txId);

    const result = await db.runTransaction(async (transaction) => {
      const [walletSnapshot, txSnapshot] = await Promise.all([
        transaction.get(walletRef),
        transaction.get(txRef),
      ]);

      if (txSnapshot.exists) {
        return {
          status: 'applied',
          wallet: getWalletFromSnapshot(uid, walletSnapshot),
          idempotent: true,
        };
      }

      const wallet = getWalletFromSnapshot(uid, walletSnapshot);
      if (deltaTokens < 0 && wallet.available < Math.abs(deltaTokens)) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Cannot debit ${Math.abs(deltaTokens)} tokens from available balance ${wallet.available}`,
        );
      }

      const nextWallet = {
        ...wallet,
        available: wallet.available + deltaTokens,
        lifetimeAdjusted: wallet.lifetimeAdjusted + deltaTokens,
      };

      transaction.set(walletRef, {
        uid,
        available: nextWallet.available,
        reserved: nextWallet.reserved,
        lifetimePurchased: nextWallet.lifetimePurchased,
        lifetimeSpent: nextWallet.lifetimeSpent,
        lifetimeAdjusted: nextWallet.lifetimeAdjusted,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      transaction.set(txRef, {
        actorUid: uid,
        actorType: 'customer',
        type: 'admin_adjustment',
        action,
        tokens: deltaTokens,
        referenceId: null,
        reservationId: null,
        idempotencyKey,
        notes: reason || null,
        adjustedBy: actorUid,
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: false });

      return {
        status: 'applied',
        wallet: nextWallet,
        idempotent: false,
      };
    });

    return result;
  },
);

export const tokenDebugSeedWallet = functions.https.onCall(
  { cors: true },
  async (request) => {
    const uid = ensureSignedIn(request.auth);
    if (process.env.NODE_ENV === 'production') {
      throw new functions.https.HttpsError('permission-denied', 'Disabled in production');
    }

    const tokens = toPositiveInteger((request.data as Record<string, unknown>)?.tokens, 100);
    const txId = await writeTokenTransaction({
      actorUid: uid,
      actorType: 'customer',
      type: 'admin_adjustment',
      action: 'admin_adjustment',
      tokens,
      idempotencyKey: `debug_seed_${Date.now()}`,
      notes: 'Debug wallet seed',
    });

    await db.collection(TOKEN_WALLETS_COLLECTION).doc(uid).set({
      uid,
      available: FieldValue.increment(tokens),
      reserved: FieldValue.increment(0),
      lifetimePurchased: FieldValue.increment(0),
      lifetimeSpent: FieldValue.increment(0),
      lifetimeAdjusted: FieldValue.increment(tokens),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { status: 'seeded', txId, tokens };
  },
);
