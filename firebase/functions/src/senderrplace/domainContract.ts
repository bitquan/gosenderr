import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {
  SENDERRPLACE_COLLECTIONS,
  SENDERRPLACE_ROLES,
  SenderrplacePaymentMode,
  buildBookingLinkCode,
  buildBookingLinkId,
  buildMerchantFingerprint,
  isValidConfirmationNumber,
  maskConfirmationNumber,
  normalizeConfirmationNumber,
  resolveUserRoles,
} from './contracts';

type AuthedCaller = {
  uid: string;
  isAdmin: boolean;
  isSeller: boolean;
  userRef: admin.firestore.DocumentReference;
  userData: Record<string, unknown>;
  roles: string[];
};

interface UpsertMerchantRequest {
  merchantName: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  placeId?: string;
}

interface CreateBookingLinkRequest {
  merchantId: string;
  confirmationNumber: string;
  expiresInMinutes?: number;
  paymentMode?: SenderrplacePaymentMode;
  idempotencyKey?: string;
}

interface RevokeBookingLinkRequest {
  linkId: string;
  reason?: string;
}

interface ValidateBookingLinkRequest {
  linkId?: string;
  linkCode?: string;
}

function getServerTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function timestampToIso(ts: admin.firestore.Timestamp | null | undefined): string | null {
  return ts ? ts.toDate().toISOString() : null;
}

function assertString(value: unknown, fieldName: string, maxLen = 200): string {
  if (typeof value !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} is required`);
  }
  if (trimmed.length > maxLen) {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} is too long`);
  }
  return trimmed;
}

async function assertSellerOrAdmin(context: functions.https.CallableContext): Promise<AuthedCaller> {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const uid = context.auth.uid;
  const userRef = admin.firestore().collection(SENDERRPLACE_COLLECTIONS.users).doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new functions.https.HttpsError('permission-denied', 'User profile not found');
  }

  const userData = (userSnap.data() || {}) as Record<string, unknown>;
  const roles = resolveUserRoles(userData);
  const isAdmin = roles.includes(SENDERRPLACE_ROLES.admin);
  const isSeller = roles.includes(SENDERRPLACE_ROLES.seller);

  if (!isAdmin && !isSeller) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Seller or admin role required for this operation',
    );
  }

  if (!roles.includes(SENDERRPLACE_ROLES.seller)) {
    roles.push(SENDERRPLACE_ROLES.seller);
    await userRef.set(
      {
        roles: Array.from(new Set(roles)),
        primaryRole: typeof userData.role === 'string' ? userData.role : SENDERRPLACE_ROLES.customer,
        updatedAt: getServerTimestamp(),
      },
      { merge: true },
    );
  }

  return {
    uid,
    isAdmin,
    isSeller,
    userRef,
    userData,
    roles,
  };
}

function normalizePaymentMode(value: unknown): SenderrplacePaymentMode {
  if (!value) {
    return 'optional';
  }
  if (value === 'required' || value === 'optional' || value === 'disabled') {
    return value;
  }
  throw new functions.https.HttpsError('invalid-argument', 'paymentMode must be required, optional, or disabled');
}

export async function upsertMerchantDirectoryEntryHandler(
  data: UpsertMerchantRequest,
  context: functions.https.CallableContext,
) {
  const caller = await assertSellerOrAdmin(context);

  const merchantName = assertString(data?.merchantName, 'merchantName', 160);
  const addressLine1 = assertString(data?.addressLine1, 'addressLine1', 200);
  const city = assertString(data?.city, 'city', 120);
  const state = assertString(data?.state, 'state', 120);
  const postalCode = assertString(data?.postalCode, 'postalCode', 40);
  const country = assertString(data?.country, 'country', 120);
  const placeId = data?.placeId ? assertString(data.placeId, 'placeId', 200) : null;

  const merchantId = buildMerchantFingerprint({
    merchantName,
    addressLine1,
    city,
    state,
    postalCode,
    country,
  });

  const merchantRef = admin
    .firestore()
    .collection(SENDERRPLACE_COLLECTIONS.merchants)
    .doc(merchantId);

  const result = await admin.firestore().runTransaction(async (tx) => {
    const existing = await tx.get(merchantRef);
    const created = !existing.exists;

    const payload: Record<string, unknown> = {
      merchantId,
      merchantName,
      addressLine1,
      city,
      state,
      postalCode,
      country,
      placeId,
      updatedAt: getServerTimestamp(),
      updatedBy: caller.uid,
      usageCount: admin.firestore.FieldValue.increment(1),
      search: {
        merchantNameLower: merchantName.toLowerCase(),
        cityLower: city.toLowerCase(),
        stateLower: state.toLowerCase(),
      },
    };

    if (created) {
      payload.createdAt = getServerTimestamp();
      payload.createdBy = caller.uid;
      payload.status = 'active';
    }

    tx.set(merchantRef, payload, { merge: true });
    return { created };
  });

  return {
    success: true,
    merchantId,
    created: result.created,
  };
}

export async function createSellerBookingLinkHandler(
  data: CreateBookingLinkRequest,
  context: functions.https.CallableContext,
) {
  const caller = await assertSellerOrAdmin(context);

  const merchantId = assertString(data?.merchantId, 'merchantId', 80);
  const confirmationRaw = assertString(data?.confirmationNumber, 'confirmationNumber', 64);
  const confirmationNumber = normalizeConfirmationNumber(confirmationRaw);
  if (!isValidConfirmationNumber(confirmationNumber)) {
    throw new functions.https.HttpsError('invalid-argument', 'confirmationNumber format is invalid');
  }

  const expiresInMinutes = data?.expiresInMinutes ?? 60;
  if (!Number.isInteger(expiresInMinutes) || expiresInMinutes < 5 || expiresInMinutes > 1440) {
    throw new functions.https.HttpsError('invalid-argument', 'expiresInMinutes must be an integer between 5 and 1440');
  }

  const paymentMode = normalizePaymentMode(data?.paymentMode);
  const idempotencyKey = data?.idempotencyKey ? assertString(data.idempotencyKey, 'idempotencyKey', 120) : null;

  const merchantSnap = await admin
    .firestore()
    .collection(SENDERRPLACE_COLLECTIONS.merchants)
    .doc(merchantId)
    .get();
  if (!merchantSnap.exists) {
    throw new functions.https.HttpsError('failed-precondition', 'merchantId not found');
  }

  const idempotencySeed = idempotencyKey ? `${caller.uid}:${idempotencyKey}` : undefined;
  const linkId = buildBookingLinkId(idempotencySeed);
  const linkRef = admin.firestore().collection(SENDERRPLACE_COLLECTIONS.bookingLinks).doc(linkId);
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + (expiresInMinutes * 60 * 1000));

  const result = await admin.firestore().runTransaction(async (tx) => {
    const existing = await tx.get(linkRef);
    if (existing.exists && idempotencyKey) {
      const existingData = existing.data() as Record<string, unknown>;
      return {
        alreadyExists: true,
        payload: existingData,
      };
    }

    if (existing.exists && !idempotencyKey) {
      throw new functions.https.HttpsError('already-exists', 'Generated booking link id collision, retry request');
    }

    const linkCode = buildBookingLinkCode();
    const payload = {
      linkId,
      linkCode,
      sellerId: caller.uid,
      merchantId,
      confirmationNumber,
      confirmationNumberMasked: maskConfirmationNumber(confirmationNumber),
      paymentMode,
      status: 'active',
      idempotencyKey,
      createdAt: getServerTimestamp(),
      updatedAt: getServerTimestamp(),
      expiresAt,
      createdByRole: caller.isAdmin ? SENDERRPLACE_ROLES.admin : SENDERRPLACE_ROLES.seller,
    };

    tx.set(linkRef, payload, { merge: false });
    return {
      alreadyExists: false,
      payload,
    };
  });

  const payload = result.payload as Record<string, unknown>;

  return {
    success: true,
    alreadyExists: result.alreadyExists,
    linkId: payload.linkId,
    linkCode: payload.linkCode,
    merchantId: payload.merchantId,
    paymentMode: payload.paymentMode,
    status: payload.status,
    expiresAt: timestampToIso((payload.expiresAt as admin.firestore.Timestamp) || expiresAt),
    confirmationNumberMasked: payload.confirmationNumberMasked,
  };
}

export async function revokeSellerBookingLinkHandler(
  data: RevokeBookingLinkRequest,
  context: functions.https.CallableContext,
) {
  const caller = await assertSellerOrAdmin(context);

  const linkId = assertString(data?.linkId, 'linkId', 80);
  const reason = data?.reason ? assertString(data.reason, 'reason', 300) : null;

  const linkRef = admin.firestore().collection(SENDERRPLACE_COLLECTIONS.bookingLinks).doc(linkId);
  const linkSnap = await linkRef.get();
  if (!linkSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'booking link not found');
  }

  const link = linkSnap.data() as Record<string, unknown>;
  const ownerId = typeof link.sellerId === 'string' ? link.sellerId : null;
  if (!caller.isAdmin && ownerId !== caller.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Only owner seller or admin can revoke link');
  }

  const status = typeof link.status === 'string' ? link.status : 'unknown';
  if (status !== 'active') {
    return {
      success: true,
      alreadyInactive: true,
      status,
    };
  }

  await linkRef.set(
    {
      status: 'revoked',
      revokeReason: reason,
      revokedBy: caller.uid,
      revokedAt: getServerTimestamp(),
      updatedAt: getServerTimestamp(),
    },
    { merge: true },
  );

  return {
    success: true,
    status: 'revoked',
  };
}

export async function validateSellerBookingLinkHandler(data: ValidateBookingLinkRequest) {
  const linkId = data?.linkId ? assertString(data.linkId, 'linkId', 80) : null;
  const linkCode = data?.linkCode ? assertString(data.linkCode, 'linkCode', 80) : null;
  if (!linkId && !linkCode) {
    throw new functions.https.HttpsError('invalid-argument', 'linkId or linkCode is required');
  }

  let linkSnap: admin.firestore.DocumentSnapshot;
  if (linkId) {
    linkSnap = await admin
      .firestore()
      .collection(SENDERRPLACE_COLLECTIONS.bookingLinks)
      .doc(linkId)
      .get();
  } else {
    const query = await admin
      .firestore()
      .collection(SENDERRPLACE_COLLECTIONS.bookingLinks)
      .where('linkCode', '==', linkCode)
      .limit(1)
      .get();
    if (query.empty) {
      throw new functions.https.HttpsError('not-found', 'booking link not found');
    }
    linkSnap = query.docs[0];
  }

  if (!linkSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'booking link not found');
  }

  const link = linkSnap.data() as Record<string, unknown>;
  const status = typeof link.status === 'string' ? link.status : 'unknown';
  if (status !== 'active') {
    throw new functions.https.HttpsError('failed-precondition', `booking link is ${status}`);
  }

  const expiresAt = link.expiresAt as admin.firestore.Timestamp | undefined;
  if (!expiresAt || expiresAt.toMillis() <= Date.now()) {
    await linkSnap.ref.set(
      { status: 'expired', updatedAt: getServerTimestamp() },
      { merge: true },
    );
    throw new functions.https.HttpsError('failed-precondition', 'booking link expired');
  }

  const merchantId = typeof link.merchantId === 'string' ? link.merchantId : '';
  const merchantSnap = merchantId ?
    await admin.firestore().collection(SENDERRPLACE_COLLECTIONS.merchants).doc(merchantId).get() :
    null;

  return {
    valid: true,
    linkId: linkSnap.id,
    linkCode: link.linkCode,
    sellerId: link.sellerId,
    merchantId,
    merchantName: merchantSnap?.data()?.merchantName || null,
    paymentMode: link.paymentMode || 'optional',
    confirmationNumberMasked: link.confirmationNumberMasked || null,
    expiresAt: timestampToIso(expiresAt),
  };
}

export const upsertMerchantDirectoryEntry = functions.https.onCall(upsertMerchantDirectoryEntryHandler);
export const createSellerBookingLink = functions.https.onCall(createSellerBookingLinkHandler);
export const revokeSellerBookingLink = functions.https.onCall(revokeSellerBookingLinkHandler);
export const validateSellerBookingLink = functions.https.onCall(validateSellerBookingLinkHandler);

