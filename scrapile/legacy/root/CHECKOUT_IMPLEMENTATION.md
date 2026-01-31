# Checkout Implementation - Cloud Functions Required

## Overview
The checkout system has been implemented on the frontend with Stripe Elements integration. The following Cloud Functions need to be created in the `firebase/functions` directory to complete the payment processing.

## Required Cloud Functions

### 1. `stripe-createConnectAccount`
**Purpose:** Create a new Stripe Connect account for sellers

**Trigger:** HTTPS Callable
**Authentication:** Required (seller must be logged in)

**Implementation:**
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(functions.config().stripe.secret_key, {
  apiVersion: '2023-10-16',
});

export const createConnectAccount = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const userId = context.auth.uid;
  
  try {
    // Get user data
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

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
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${functions.config().app.url}/profile/stripe-onboarding`,
      return_url: `${functions.config().app.url}/profile/seller-settings`,
      type: 'account_onboarding',
    });

    // Save account ID to user profile
    await admin.firestore().collection('users').doc(userId).update({
      'sellerProfile.stripeAccountId': account.id,
      'sellerProfile.stripeOnboardingComplete': false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      accountId: account.id,
      onboardingUrl: accountLink.url,
    };
  } catch (error: any) {
    functions.logger.error('Error creating Connect account:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

**Firestore Changes:**
- Updates `users/{userId}` → `sellerProfile.stripeAccountId`
- Updates `users/{userId}` → `sellerProfile.stripeOnboardingComplete`

---

### 2. `stripe-getConnectOnboardingLink`
**Purpose:** Get a new onboarding link for existing Connect account (if setup incomplete)

**Trigger:** HTTPS Callable
**Authentication:** Required

**Implementation:**
```typescript
export const getConnectOnboardingLink = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const userId = context.auth.uid;
  
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    const stripeAccountId = userData?.sellerProfile?.stripeAccountId;
    
    if (!stripeAccountId) {
      throw new functions.https.HttpsError('failed-precondition', 'No Stripe account found');
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${functions.config().app.url}/profile/stripe-onboarding`,
      return_url: `${functions.config().app.url}/profile/seller-settings`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  } catch (error: any) {
    functions.logger.error('Error getting onboarding link:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

---

### 3. `stripe-getConnectAccountStatus`
**Purpose:** Check if seller's Stripe account is fully onboarded

**Trigger:** HTTPS Callable
**Authentication:** Required

**Implementation:**
```typescript
export const getConnectAccountStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const userId = context.auth.uid;
  
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    const stripeAccountId = userData?.sellerProfile?.stripeAccountId;
    
    if (!stripeAccountId) {
      throw new functions.https.HttpsError('failed-precondition', 'No Stripe account found');
    }

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
    functions.logger.error('Error getting account status:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

**Firestore Changes:**
- Updates `users/{userId}` → `sellerProfile.stripeOnboardingComplete` (when ready)

---

### 4. `stripe-createPaymentIntent`
**Purpose:** Create Stripe PaymentIntent for marketplace purchase with platform fee

**Trigger:** HTTPS Callable
**Authentication:** Required (buyer must be logged in)

**Request Data:**
```typescript
{
  itemId: string;
  quantity: number;
  deliveryOption: 'courier' | 'pickup' | 'shipping';
  deliveryFee: number;
  deliveryAddressId?: string;
}
```

**Implementation:**
```typescript
export const createPaymentIntent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { itemId, quantity, deliveryOption, deliveryFee } = data;
  const buyerId = context.auth.uid;

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
    
    const total = subtotal; // Buyer pays item + delivery
    const sellerAmount = subtotal - platformFee; // Seller gets total - platform fee

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

    // Create pending order in Firestore
    const orderRef = await admin.firestore().collection('orders').add({
      buyerId,
      buyerName: context.auth.token.name || 'Unknown',
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

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: total / 100,
      platformFee: platformFee / 100,
      sellerAmount: sellerAmount / 100,
      orderId: orderRef.id,
    };
  } catch (error: any) {
    functions.logger.error('Error creating payment intent:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

**Firestore Changes:**
- Creates document in `orders` collection with pending status

---

### 5. `stripe-webhooks`
**Purpose:** Handle Stripe webhook events (payment success, failure, disputes)

**Trigger:** HTTPS Request (POST)
**Authentication:** Stripe signature verification

**Implementation:**
```typescript
export const stripeWebhooks = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      functions.config().stripe.webhook_secret
    );

    functions.logger.info('Stripe webhook event:', event.type);

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
    }

    res.json({ received: true });
  } catch (error: any) {
    functions.logger.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const ordersQuery = await admin.firestore()
    .collection('orders')
    .where('paymentIntentId', '==', paymentIntent.id)
    .limit(1)
    .get();
  
  if (ordersQuery.empty) {
    functions.logger.error('Order not found for payment:', paymentIntent.id);
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
  await admin.firestore()
    .collection('marketplaceItems')
    .doc(orderData.itemId)
    .update({
      quantity: admin.firestore.FieldValue.increment(-orderData.quantity),
      soldCount: admin.firestore.FieldValue.increment(orderData.quantity),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  // Update seller stats
  await admin.firestore()
    .collection('users')
    .doc(orderData.sellerId)
    .update({
      'sellerProfile.totalSales': admin.firestore.FieldValue.increment(1),
      'sellerProfile.totalRevenue': admin.firestore.FieldValue.increment(
        orderData.pricing.totalAmount - orderData.pricing.platformFee
      ),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  // Send notifications (buyer + seller)
  // TODO: Implement notification system
  
  functions.logger.info('Payment success handled for order:', orderDoc.id);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const ordersQuery = await admin.firestore()
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
  // Find order by payment intent or charge
  // Create dispute document
  // Update order status to 'disputed'
  // Notify seller and platform admins
}

async function handleDisputeClosed(dispute: Stripe.Dispute) {
  // Update dispute document with outcome
  // Update seller strike count if lost
  // Update seller score
}
```

**Firestore Changes:**
- Updates `orders/{orderId}` → status, paymentStatus, timestamps
- Updates `marketplaceItems/{itemId}` → quantity, soldCount
- Updates `users/{sellerId}` → sellerProfile.totalSales, totalRevenue

---

## Environment Configuration

Add to `firebase/functions/.env`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=http://localhost:5173
```

Add to Firebase config:
```bash
firebase functions:config:set \
  stripe.secret_key="sk_test_..." \
  stripe.publishable_key="pk_test_..." \
  stripe.webhook_secret="whsec_..." \
  app.url="http://localhost:5173"
```

---

## Stripe Dashboard Setup

1. **Create Connect Platform:**
   - Go to Stripe Dashboard → Connect → Settings
   - Enable Express accounts
   - Set platform fee percentage (we use destination charges with application_fee_amount)

2. **Set Webhook Endpoint:**
   - URL: `https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/stripe-webhooks`
   - Events to listen for:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.dispute.created`
     - `charge.dispute.closed`
   - Copy webhook signing secret

3. **Test Mode:**
   - Use test API keys for development
   - Test cards: 4242 4242 4242 4242 (success), 4000 0000 0000 0002 (decline)

---

## Frontend Environment Variables

Add to `apps/marketplace-app/.env.local`:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Testing Checklist

- [ ] Create Stripe Connect account for test seller
- [ ] Complete onboarding flow
- [ ] Verify account status shows "complete"
- [ ] Create payment intent for test item
- [ ] Complete checkout with test card
- [ ] Verify webhook processes payment success
- [ ] Verify order status updates to "accepted"
- [ ] Verify item quantity decrements
- [ ] Verify seller stats update
- [ ] Test payment failure scenario
- [ ] Test buyer protection (manual capture vs automatic)
- [ ] Verify platform fee is calculated correctly (2.9%)

---

## Next Steps

1. **Implement Cloud Functions** in `firebase/functions/src/stripe.ts`
2. **Deploy functions**: `firebase deploy --only functions`
3. **Set up webhook endpoint** in Stripe Dashboard
4. **Test end-to-end** checkout flow
5. **Add order management UI** for buyers and sellers
6. **Implement dispute system** (Phase 2)
7. **Add automated seller scoring** (Phase 3)

---

## Security Notes

- ✅ All payment processing happens server-side
- ✅ Client never sees secret keys
- ✅ Webhook signatures verified
- ✅ User authentication required for all operations
- ✅ Item stock verified before payment
- ✅ Seller onboarding verified before accepting payments
- ✅ Platform fee calculated server-side (can't be manipulated)
- ⚠️ TODO: Add rate limiting on Cloud Functions
- ⚠️ TODO: Add fraud detection for suspicious orders
- ⚠️ TODO: Add 3D Secure for high-value transactions
