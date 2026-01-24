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

interface CreatePaymentIntentData {
  jobId: string;
  courierRate: number;
  platformFee: number;
}

export const createPaymentIntent = functions.https.onCall<CreatePaymentIntentData>(
  {
    cors: true,
  },
  async (request) => {
    // Authentication check
    if (!request.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to create payment intent'
      );
    }

    const { jobId, courierRate, platformFee } = request.data;

    // Validation
    if (!jobId || courierRate === undefined || platformFee === undefined) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: jobId, courierRate, platformFee'
      );
    }

    if (typeof courierRate !== 'number' || typeof platformFee !== 'number') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'courierRate and platformFee must be numbers'
      );
    }

    if (courierRate < 0 || platformFee < 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'courierRate and platformFee must be non-negative'
      );
    }

    try {
      // Calculate total amount in cents
      const totalAmount = Math.round((courierRate + platformFee) * 100);

      // Create PaymentIntent with manual capture
      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'usd',
        capture_method: 'manual',
        metadata: {
          jobId,
          courierRate: courierRate.toString(),
          platformFee: platformFee.toString(),
          userId: request.auth.uid,
        },
      });

      console.log(`PaymentIntent created: ${paymentIntent.id} for job ${jobId}`);

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);
