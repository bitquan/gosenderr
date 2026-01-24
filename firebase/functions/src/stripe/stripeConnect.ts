import * as functions from 'firebase-functions/v2';
import Stripe from 'stripe';

function getStripe() {
  const legacyConfig = (functions as any).config?.();
  const apiKey = legacyConfig?.stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
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
    cors: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'https://gosenderr-6773f.web.app',
      'https://gosenderr-6773f.firebaseapp.com'
    ],
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
