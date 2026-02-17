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

    const stripeDoc = await db.doc('secrets/stripe').get();
    const stripeData = stripeDoc.exists ? stripeDoc.data() : {};
    const configuredMode = stripeData?.mode || 'test';
    const liveWebhookSecret = stripeData?.liveWebhookSecret || '';
    const testWebhookSecret = stripeData?.webhookSecret || '';
    const webhookSecret = configuredMode === 'live' && liveWebhookSecret
      ? liveWebhookSecret
      : testWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET;

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
        case 'account.updated': {
          const account = event.data.object as Stripe.Account;
          await handleAccountUpdated(account);
          break;
        }
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

  const tokenPurchaseHandled = await handleTokenPurchaseCheckout(session);
  if (tokenPurchaseHandled) {
    return;
  }

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

async function handleTokenPurchaseCheckout(session: Stripe.Checkout.Session): Promise<boolean> {
  const metadata = session.metadata || {};
  if (metadata.purchaseType !== 'token_purchase') {
    return false;
  }

  const uid = metadata.uid || session.client_reference_id;
  const tokens = Number(metadata.tokens || 0);
  const idempotencyKey = metadata.idempotencyKey || session.id;

  if (!uid || !Number.isFinite(tokens) || tokens <= 0) {
    console.error('Invalid token purchase session metadata', {
      sessionId: session.id,
      uid,
      tokens,
    });
    return true;
  }

  const walletRef = db.doc(`tokenWallets/${uid}`);
  const checkoutRef = db.doc(`tokenCheckoutSessions/${idempotencyKey}`);
  const purchaseTxRef = db.doc(`tokenTransactions/stripe_purchase_${session.id}`);

  await db.runTransaction(async (tx) => {
    const [walletSnap, checkoutSnap, purchaseTxSnap] = await Promise.all([
      tx.get(walletRef),
      tx.get(checkoutRef),
      tx.get(purchaseTxRef),
    ]);

    if (purchaseTxSnap.exists) {
      return;
    }

    const walletData = walletSnap.exists ? walletSnap.data() || {} : {};
    const currentAvailable = Number(walletData.available || 0);
    const currentReserved = Number(walletData.reserved || 0);
    const currentPurchased = Number(walletData.lifetimePurchased || 0);
    const currentSpent = Number(walletData.lifetimeSpent || 0);
    const currentAdjusted = Number(walletData.lifetimeAdjusted || 0);

    tx.set(walletRef, {
      available: currentAvailable + tokens,
      reserved: currentReserved,
      lifetimePurchased: currentPurchased + tokens,
      lifetimeSpent: currentSpent,
      lifetimeAdjusted: currentAdjusted,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    tx.set(purchaseTxRef, {
      uid,
      type: 'purchase',
      actorType: 'system',
      action: 'token_purchase',
      amount: tokens,
      idempotencyKey: `stripe_checkout_${session.id}`,
      metadata: {
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent || null,
        packId: metadata.packId || null,
        checkoutIdempotencyKey: idempotencyKey,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    tx.set(checkoutRef, {
      uid,
      stripeSessionId: session.id,
      paymentStatus: 'paid',
      fulfilled: true,
      fulfilledAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentIntentId: session.payment_intent || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(checkoutSnap.exists ? {} : {
        idempotencyKey,
        tokens,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    }, { merge: true });
  });

  console.log('Token wallet credited from checkout session', {
    sessionId: session.id,
    uid,
    tokens,
    idempotencyKey,
  });

  return true;
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

async function handleAccountUpdated(account: Stripe.Account) {
  const accountId = account.id;
  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const requirements = account.requirements;
  const requirementsDue = requirements?.currently_due || [];
  const requirementsPastDue = requirements?.past_due || [];
  const status = chargesEnabled && payoutsEnabled ? 'verified' : 'pending';

  const updates = {
    'courierProfile.stripeConnectAccountId': accountId,
    'courierProfile.stripeChargesEnabled': chargesEnabled,
    'courierProfile.stripePayoutsEnabled': payoutsEnabled,
    'courierProfile.stripeRequirementsDue': requirementsDue,
    'courierProfile.stripeRequirementsPastDue': requirementsPastDue,
    'courierProfile.stripeAccountStatus': status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const usersRef = db.collection('users');

  const byConnect = await usersRef
    .where('courierProfile.stripeConnectAccountId', '==', accountId)
    .get();

  const byLegacy = byConnect.empty
    ? await usersRef
        .where('courierProfile.stripeAccountId', '==', accountId)
        .get()
    : null;

  const snapshots = byConnect.empty ? byLegacy : byConnect;

  if (!snapshots || snapshots.empty) {
    console.warn(`No courier user found for Stripe account ${accountId}`);
    return;
  }

  const batch = db.batch();
  snapshots.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, updates);
  });
  await batch.commit();
}
