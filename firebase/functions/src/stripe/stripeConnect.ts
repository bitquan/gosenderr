import * as functions from 'firebase-functions/v2';
import { getStripeClient } from './stripeSecrets';

interface StripeConnectData {
  accountId?: string | null;
  refreshUrl: string;
  returnUrl: string;
}

export const stripeConnect = functions.https.onCall<StripeConnectData>(
  {
    cors: true,
    // secrets: ['STRIPE_SECRET_KEY'],
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
      const stripe = await getStripeClient();
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
