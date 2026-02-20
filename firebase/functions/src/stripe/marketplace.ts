/**
 * Stripe Marketplace Functions
 * Handle Connect accounts and payment processing for marketplace sellers
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import type Stripe from 'stripe';
import { getStripeClient } from './stripeSecrets';

// ============================================================================
// CREATE CONNECT ACCOUNT
// ============================================================================

export const createConnectAccount = functions.https.onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = request.auth.uid;

    try {
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (!userData) {
        throw new functions.https.HttpsError('not-found', 'User not found');
      }

      const stripe = await getStripeClient();

      // Create Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: userData.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          userId,
          userEmail: userData.email,
        },
      });

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.APP_URL || 'http://localhost:5173'}/profile/stripe-onboarding`,
        return_url: `${process.env.APP_URL || 'http://localhost:5173'}/profile/seller-settings`,
        type: 'account_onboarding',
      });

      // Save account ID to user profile
      await admin.firestore().collection('users').doc(userId).update({
        'sellerProfile.stripeAccountId': account.id,
        'sellerProfile.stripeOnboardingComplete': false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Stripe Connect account created for user ${userId}: ${account.id}`);

      return {
        accountId: account.id,
        onboardingUrl: accountLink.url,
      };
    } catch (error: any) {
      console.error('Error creating Connect account:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);

// ============================================================================
// GET CONNECT ONBOARDING LINK
// ============================================================================

export const getConnectOnboardingLink = functions.https.onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = request.auth.uid;

    try {
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      const userData = userDoc.data();

      const stripeAccountId = userData?.sellerProfile?.stripeAccountId;

      if (!stripeAccountId) {
        throw new functions.https.HttpsError('failed-precondition', 'No Stripe account found');
      }

      const stripe = await getStripeClient();
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${process.env.APP_URL || 'http://localhost:5173'}/profile/stripe-onboarding`,
        return_url: `${process.env.APP_URL || 'http://localhost:5173'}/profile/seller-settings`,
        type: 'account_onboarding',
      });

      return { url: accountLink.url };
    } catch (error: any) {
      console.error('Error getting onboarding link:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);

// ============================================================================
// GET CONNECT ACCOUNT STATUS
// ============================================================================

export const getConnectAccountStatus = functions.https.onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const userId = request.auth.uid;

    try {
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      const userData = userDoc.data();

      const stripeAccountId = userData?.sellerProfile?.stripeAccountId;

      if (!stripeAccountId) {
        throw new functions.https.HttpsError('failed-precondition', 'No Stripe account found');
      }

      const stripe = await getStripeClient();
      const account = await stripe.accounts.retrieve(stripeAccountId);

      // Update onboarding status in Firestore
      if (account.details_submitted && account.charges_enabled) {
        await admin.firestore().collection('users').doc(userId).update({
          'sellerProfile.stripeOnboardingComplete': true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return {
        accountId: account.id,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || [],
        },
      };
    } catch (error: any) {
      console.error('Error getting account status:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);

// ============================================================================
// CREATE PAYMENT INTENT (MARKETPLACE)
// ============================================================================

interface CreateMarketplacePaymentIntentData {
  itemId: string;
  quantity: number;
  deliveryOption: 'courier' | 'pickup' | 'shipping';
  deliveryFee: number;
  deliveryAddressId?: string;
}

export const createPaymentIntent = functions.https.onCall<CreateMarketplacePaymentIntentData>(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { itemId, quantity, deliveryOption, deliveryFee } = request.data;
    const buyerId = request.auth.uid;

    try {
      // Get item details
      const itemDoc = await admin.firestore().collection('marketplaceItems').doc(itemId).get();
      if (!itemDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Item not found');
      }

      const item = itemDoc.data()!;

      // Verify stock
      if (item.quantity < quantity) {
        throw new functions.https.HttpsError('failed-precondition', 'Insufficient stock');
      }

      // Get seller's Stripe account
      const sellerDoc = await admin.firestore().collection('users').doc(item.sellerId).get();
      const sellerData = sellerDoc.data();

      if (!sellerData?.sellerProfile?.stripeAccountId) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Seller has not set up payments'
        );
      }

      const stripeAccountId = sellerData.sellerProfile.stripeAccountId;

      // Check buyer protection setting
      const buyerProtectionEnabled = sellerData.sellerProfile.buyerProtectionEnabled || false;

      // Calculate amounts (in cents)
      const itemTotal = Math.round(item.price * quantity * 100);
      const deliveryTotal = Math.round(deliveryFee * 100);
      const subtotal = itemTotal + deliveryTotal;

      // Platform fee: 2.9% of item price (not delivery)
      const platformFee = Math.round(itemTotal * 0.029);

      const total = subtotal;
      const sellerAmount = subtotal - platformFee;

      const stripe = await getStripeClient();

      // Create PaymentIntent with destination charges
      const paymentIntent = await stripe.paymentIntents.create({
        amount: total,
        currency: 'usd',
        application_fee_amount: platformFee,
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: {
          itemId,
          sellerId: item.sellerId,
          buyerId,
          quantity: quantity.toString(),
          deliveryOption,
          buyerProtectionEnabled: buyerProtectionEnabled.toString(),
        },
        // Hold funds for 3 days if buyer protection enabled
        capture_method: buyerProtectionEnabled ? 'manual' : 'automatic',
      });

      // Get buyer info
      const buyerDoc = await admin.firestore().collection('users').doc(buyerId).get();
      const buyerData = buyerDoc.data();

      // Create pending order in Firestore
      const orderRef = await admin.firestore().collection('orders').add({
        buyerId,
        buyerName: buyerData?.displayName || 'Unknown',
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        itemId,
        itemSnapshot: {
          title: item.title,
          description: item.description,
          photos: item.photos,
          price: item.price,
        },
        quantity,
        deliveryOption,
        pricing: {
          itemPrice: item.price,
          deliveryFee: deliveryFee,
          platformFee: platformFee / 100,
          totalAmount: total / 100,
        },
        paymentIntentId: paymentIntent.id,
        paymentStatus: 'pending',
        status: 'pending',
        placedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Payment intent created: ${paymentIntent.id} for item ${itemId}`);

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: total / 100,
        platformFee: platformFee / 100,
        sellerAmount: sellerAmount / 100,
        orderId: orderRef.id,
      };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
);

// ============================================================================
// STRIPE WEBHOOKS
// ============================================================================

export const stripeWebhooks = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    res.status(400).send('No signature');
    return;
  }

  try {
    const stripe = await getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);

    console.log('Stripe webhook event:', event.type);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      case 'charge.dispute.closed':
        await handleDisputeClosed(event.data.object as Stripe.Dispute);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const ordersQuery = await admin
    .firestore()
    .collection('orders')
    .where('paymentIntentId', '==', paymentIntent.id)
    .limit(1)
    .get();

  if (ordersQuery.empty) {
    console.error('Order not found for payment:', paymentIntent.id);
    return;
  }

  const orderDoc = ordersQuery.docs[0];
  const orderData = orderDoc.data();

  // Update order status
  await orderDoc.ref.update({
    paymentStatus: 'captured',
    status: 'accepted',
    acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Decrement item quantity
  await admin
    .firestore()
    .collection('marketplaceItems')
    .doc(orderData.itemId)
    .update({
      quantity: admin.firestore.FieldValue.increment(-orderData.quantity),
      soldCount: admin.firestore.FieldValue.increment(orderData.quantity),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  // Update seller stats
  await admin
    .firestore()
    .collection('users')
    .doc(orderData.sellerId)
    .update({
      'sellerProfile.totalSales': admin.firestore.FieldValue.increment(1),
      'sellerProfile.totalRevenue': admin.firestore.FieldValue.increment(
        orderData.pricing.totalAmount - orderData.pricing.platformFee
      ),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  console.log('Payment success handled for order:', orderDoc.id);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const ordersQuery = await admin
    .firestore()
    .collection('orders')
    .where('paymentIntentId', '==', paymentIntent.id)
    .limit(1)
    .get();

  if (!ordersQuery.empty) {
    await ordersQuery.docs[0].ref.update({
      paymentStatus: 'failed',
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancellationReason: 'Payment failed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  // TODO: Implement dispute handling
  console.log('Dispute created:', dispute.id);
}

async function handleDisputeClosed(dispute: Stripe.Dispute) {
  // TODO: Implement dispute closure handling
  console.log('Dispute closed:', dispute.id, 'Status:', dispute.status);
}
