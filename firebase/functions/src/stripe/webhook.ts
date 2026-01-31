import * as functions from 'firebase-functions/v2';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import { getStripeClient } from './stripeSecrets';

const db = admin.firestore();

export const stripeWebhook = functions.https.onRequest(
  { 
    cors: true,
    // secrets: ['STRIPE_WEBHOOK_SECRET']
  },
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      console.error('Missing stripe-signature header');
      res.status(400).send('Missing stripe-signature header');
      return;
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      res.status(500).send('Webhook secret not configured');
      return;
    }

    let event: Stripe.Event;

    try {
      const stripe = await getStripeClient();
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        webhookSecret
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutComplete(session);
          break;
        }
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentIntentSucceeded(paymentIntent);
          break;
        }
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed:', session.id);

  // Find the marketplace order by checkoutSessionId
  const ordersSnapshot = await db
    .collection('marketplaceOrders')
    .where('checkoutSessionId', '==', session.id)
    .limit(1)
    .get();

  if (ordersSnapshot.empty) {
    console.error('No marketplace order found for session:', session.id);
    return;
  }

  const orderDoc = ordersSnapshot.docs[0];
  const orderData = orderDoc.data();

  // Check if order is for delivery (not pickup)
  if (orderData.deliveryMethod === 'pickup') {
    // For pickup orders, just update status to pending_pickup
    await orderDoc.ref.update({
      status: 'pending_pickup',
      paymentStatus: 'paid',
      paymentIntentId: session.payment_intent,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('Pickup order marked as paid:', orderDoc.id);
    return;
  }

  // For delivery orders, create a delivery job
  const itemDoc = await db.collection('items').doc(orderData.itemId).get();
  if (!itemDoc.exists) {
    console.error('Item not found:', orderData.itemId);
    return;
  }

  const itemData = itemDoc.data();

  // Create job in the "jobs" collection that couriers watch
  const jobData = {
    createdByUid: orderData.buyerId,
    courierUid: orderData.courierId || null,
    agreedFee: orderData.deliveryFee || null,
    status: orderData.courierId ? 'assigned' : 'open',
    pickup: {
      lat: itemData?.pickupLocation?.lat || 0,
      lng: itemData?.pickupLocation?.lng || 0,
      label: itemData?.pickupLocation?.address || 'Pickup location',
    },
    dropoff: {
      lat: orderData.dropoffAddress?.lat || 0,
      lng: orderData.dropoffAddress?.lng || 0,
      label: orderData.dropoffAddress?.address || 'Dropoff location',
    },
    package: {
      size: itemData?.isFoodItem ? 'small' : 'medium',
      notes: `Marketplace delivery: ${orderData.itemTitle}`,
    },
    photos: [],
    // Marketplace-specific metadata
    marketplaceOrderId: orderDoc.id,
    itemId: orderData.itemId,
    itemTitle: orderData.itemTitle,
    itemPrice: orderData.itemPrice,
    sellerId: orderData.sellerId,
    deliveryFee: orderData.deliveryFee,
    distance: orderData.distance,
    estimatedMinutes: orderData.estimatedMinutes,
    ...(itemData?.isFoodItem && {
      isFoodItem: true,
      foodDetails: itemData.foodDetails || {},
    }),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const jobRef = await db.collection('jobs').add(jobData);

  // Update marketplace order with payment details and job reference
  await orderDoc.ref.update({
    status: 'paid',
    paymentStatus: 'paid',
    paymentIntentId: session.payment_intent,
    jobId: jobRef.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Created job ${jobRef.id} for marketplace order ${orderDoc.id}`);
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing payment_intent.succeeded:', paymentIntent.id);

  // Check if this payment has courier info for 3-way split
  const hasCourierStripe = paymentIntent.metadata?.hasCourierStripe === 'true';
  const courierStripeAccountId = paymentIntent.metadata?.courierStripeAccountId;
  const deliveryFee = paymentIntent.metadata?.deliveryFee;

  if (!hasCourierStripe || !courierStripeAccountId || !deliveryFee) {
    console.log('No courier transfer needed for this payment');
    return;
  }

  try {
    // Transfer delivery fee to courier
    const deliveryFeeAmount = Math.round(Number(deliveryFee) * 100);

    const stripe = await getStripeClient();
    const transfer = await stripe.transfers.create({
      amount: deliveryFeeAmount,
      currency: 'usd',
      destination: courierStripeAccountId,
      transfer_group: paymentIntent.id,
      description: `Delivery fee for payment ${paymentIntent.id}`,
      metadata: {
        paymentIntentId: paymentIntent.id,
        type: 'courier_delivery_fee',
      },
    });

    console.log(
      `✅ Transferred $${deliveryFee} to courier ${courierStripeAccountId}`,
      { transferId: transfer.id }
    );

    // Update marketplace order with transfer info
    const ordersSnapshot = await db
      .collection('marketplaceOrders')
      .where('paymentIntentId', '==', paymentIntent.id)
      .limit(1)
      .get();

    if (!ordersSnapshot.empty) {
      await ordersSnapshot.docs[0].ref.update({
        courierTransferId: transfer.id,
        courierPaymentStatus: 'transferred',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (error: any) {
    console.error('❌ Failed to transfer to courier:', error);
  }
}
