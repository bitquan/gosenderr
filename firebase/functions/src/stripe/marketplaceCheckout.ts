import * as functions from 'firebase-functions/v2';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

interface MarketplaceCheckoutData {
  itemTitle: string;
  itemPrice: number;
  deliveryFee: number;
  platformFee: number;
  sellerStripeAccountId: string;
  courierStripeAccountId?: string | null;
  successUrl: string;
  cancelUrl: string;
}

export const marketplaceCheckout = functions.https.onCall<MarketplaceCheckoutData>(
  async (request) => {
    // Authentication check
    if (!request.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to create checkout session'
      );
    }

    const {
      itemTitle,
      itemPrice,
      deliveryFee,
      platformFee,
      sellerStripeAccountId,
      courierStripeAccountId,
      successUrl,
      cancelUrl,
    } = request.data;

    // Validation
    if (
      !itemTitle ||
      itemPrice === undefined ||
      deliveryFee === undefined ||
      platformFee === undefined ||
      !sellerStripeAccountId ||
      !successUrl ||
      !cancelUrl
    ) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields'
      );
    }

    const total = Number(itemPrice) + Number(deliveryFee) + Number(platformFee);
    const hasCourierStripe =
      courierStripeAccountId && courierStripeAccountId.startsWith('acct_');

    try {
      if (hasCourierStripe) {
        // 3-WAY SPLIT: Vendor + Courier + Platform
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: { name: itemTitle },
                unit_amount: Math.round(Number(itemPrice) * 100),
              },
              quantity: 1,
            },
            {
              price_data: {
                currency: 'usd',
                product_data: { name: 'Delivery by Senderr' },
                unit_amount: Math.round(Number(deliveryFee) * 100),
              },
              quantity: 1,
            },
            {
              price_data: {
                currency: 'usd',
                product_data: { name: 'Platform Fee' },
                unit_amount: Math.round(Number(platformFee) * 100),
              },
              quantity: 1,
            },
          ],
          payment_intent_data: {
            application_fee_amount: Math.round(Number(platformFee) * 100),
            transfer_data: {
              destination: sellerStripeAccountId,
            },
            metadata: {
              courierStripeAccountId: courierStripeAccountId!,
              deliveryFee: deliveryFee.toString(),
              userId: request.auth.uid,
              hasCourierStripe: 'true',
            },
          },
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            itemTitle,
            total: total.toFixed(2),
            hasCourierStripe: 'true',
            courierStripeAccountId: courierStripeAccountId!,
            deliveryFee: deliveryFee.toString(),
            userId: request.auth.uid,
          },
        });

        return { url: session.url, sessionId: session.id };
      } else {
        // 2-WAY SPLIT: Vendor + Platform (manual courier payout)
        const applicationFeeAmount = Math.round(
          (Number(deliveryFee) + Number(platformFee)) * 100
        );

        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: { name: itemTitle },
                unit_amount: Math.round(Number(itemPrice) * 100),
              },
              quantity: 1,
            },
            {
              price_data: {
                currency: 'usd',
                product_data: { name: 'Delivery (Manual Payout)' },
                unit_amount: Math.round(Number(deliveryFee) * 100),
              },
              quantity: 1,
            },
            {
              price_data: {
                currency: 'usd',
                product_data: { name: 'Platform Fee' },
                unit_amount: Math.round(Number(platformFee) * 100),
              },
              quantity: 1,
            },
          ],
          payment_intent_data: {
            application_fee_amount: applicationFeeAmount,
            transfer_data: {
              destination: sellerStripeAccountId,
            },
            metadata: {
              userId: request.auth.uid,
            },
          },
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            itemTitle,
            total: total.toFixed(2),
            hasCourierStripe: 'false',
            userId: request.auth.uid,
          },
        });

        return { url: session.url, sessionId: session.id };
      }
    } catch (error: any) {
      console.error('Error creating marketplace checkout session:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);
