import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { getStripeClient } from './stripeSecrets';

async function ensureAdmin(uid: string) {
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  const role = userDoc.data()?.role;
  if (role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
}

export const createStripeLoginLink = functions.https.onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    await ensureAdmin(request.auth.uid);

    const targetUserId = request.data?.userId as string | undefined;
    if (!targetUserId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing userId');
    }

    const userDoc = await admin.firestore().doc(`users/${targetUserId}`).get();
    const stripeAccountId = userDoc.data()?.sellerProfile?.stripeAccountId;
    if (!stripeAccountId) {
      throw new functions.https.HttpsError('failed-precondition', 'Seller has no Stripe account');
    }

    const stripe = await getStripeClient();
    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);

    return { url: loginLink.url };
  }
);
