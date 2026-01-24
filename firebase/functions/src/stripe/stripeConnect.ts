import * as functions from 'firebase-functions/v2';
import { defineString } from 'firebase-functions/params';
import Stripe from 'stripe';

const stripeSecretKey = defineString('STRIPE_SECRET_KEY', {
  default: 'sk_test_51S2bUFBaCU2Z8YfchEvNaqg6Vr6xxsOWvFkt4mWGbAustjJ6ix4x2kpXqL1FZMLjSFu7x1CAYoMHzhwSUQke41xZ00Ly9u42FG'
});

function getStripe() {
  const apiKey = stripeSecretKey.value();
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(apiKey, {
    apiVersion: '2025-02-24.acacia',
  });
}

interface StripeConnectData {
  accountId?: string | null;
  refreshUrl: string;
  returnUrl: string;
}

export const stripeConnect = functions.https.onCall<StripeConnectData>(
  {
    cors: true,
  },
  async (request) => {
    // Authentication check
    if (!request.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to connect Stripe account'
      );
    }

    const { accountId, refreshUrl, returnUrl } = request.data;

    // Validation
    if (!refreshUrl || !returnUrl) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: refreshUrl, returnUrl'
      );
    }

    try {
      // Create or retrieve Stripe Connect account
      const stripe = getStripe();
      const account = accountId
        ? await stripe.accounts.retrieve(accountId)
        : await stripe.accounts.create({
            type: 'express',
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            metadata: {
              userId: request.auth.uid,
            },
          });

      // Create account link for onboarding
      const link = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      console.log(`Stripe Connect link created for user ${request.auth.uid}`);

      return {
        accountId: account.id,
        url: link.url,
      };
    } catch (error: any) {
      console.error('Error creating Stripe Connect link:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);
