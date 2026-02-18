import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getStripeClient } from './stripeSecrets';

// Ensure admin is initialized (safe to call multiple times)
if (!admin.apps.length) {
  admin.initializeApp();
}

interface MarketplaceItem {
  itemId: string;
  title: string;
  quantity: number;
  price: number;
  vendorId: string;
}

interface CreateMarketplaceOrderData {
  amount: number;
  currency: string;
  paymentMethodId: string; // 'external' = buyer will pay seller externally (cash/venmo/etc)
  externalProvider?: string;
  shippingInfo: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  items: MarketplaceItem[];
}

const EXTERNAL_PAYMENT_METHOD_IDS = new Set([
  'external',
  'cash',
  'cash_app',
  'cashapp',
  'venmo',
  'zelle',
  'paypal',
  'apple_cash',
]);

function resolveExternalRail(paymentMethodId: string, externalProvider?: string): { isExternal: boolean; provider: string } {
  const normalizedPaymentMethod = String(paymentMethodId || '').trim().toLowerCase();
  const normalizedProvider = String(externalProvider || '').trim().toLowerCase();

  if (normalizedProvider) {
    return { isExternal: true, provider: normalizedProvider };
  }

  if (EXTERNAL_PAYMENT_METHOD_IDS.has(normalizedPaymentMethod) || normalizedPaymentMethod.startsWith('external_')) {
    return { isExternal: true, provider: normalizedPaymentMethod || 'external' };
  }

  return { isExternal: false, provider: 'stripe' };
}

export const createMarketplaceOrder = functions.https.onCall<CreateMarketplaceOrderData>(
  {
    cors: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    // secrets: ['STRIPE_SECRET_KEY'],
  },
  async (request) => {
    // Authentication check
    if (!request.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to create an order'
      );
    }

    const { amount, currency, paymentMethodId, shippingInfo, items } = request.data;

    // Validation
    if (!amount || !currency || !paymentMethodId || !shippingInfo || !items || items.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields'
      );
    }

    try {
      const db = admin.firestore();

      const externalRail = resolveExternalRail(paymentMethodId, request.data.externalProvider);
      const isExternal = externalRail.isExternal;

      // Handle external (non-Stripe) payments: charge tokenPolicy.costs.cashFee from buyer's token wallet
      if (isExternal) {
        const timestamp = FieldValue.serverTimestamp();

        // Read token policy for external rail token gate
        const policySnap = await db.doc('platformSettings/tokenPolicy').get();
        const policyData = policySnap.exists ? (policySnap.data() || {}) as any : {};
        const tokenPolicyEnabled = policyData.enabled !== false;
        const externalRailRequiresTokens = policyData.externalRailRequiresTokens !== false;
        const cashFee = Number(policyData.costs?.cashFee) || 1;
        const requiredTokenCharge = tokenPolicyEnabled && externalRailRequiresTokens ? cashFee : 0;

        // Create order record (no Stripe intent)
        const orderData = {
          customerId: request.auth.uid,
          customerEmail: shippingInfo.email,
          items: items.map(item => ({
            itemId: item.itemId,
            title: item.title,
            quantity: item.quantity,
            price: item.price,
            vendorId: item.vendorId,
          })),
          shippingInfo: {
            fullName: shippingInfo.fullName,
            email: shippingInfo.email,
            phone: shippingInfo.phone,
            address: shippingInfo.address,
            city: shippingInfo.city,
            state: shippingInfo.state,
            zipCode: shippingInfo.zipCode,
            country: shippingInfo.country,
          },
          subtotal: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          shipping: 0,
          tax: amount / 100 - items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          total: amount / 100,
          paymentIntentId: 'external',
          paymentRail: 'external',
          externalPaymentProvider: externalRail.provider,
          paymentStatus: 'pending',
          status: 'pending',
          createdAt: timestamp,
          updatedAt: timestamp,
        } as any;

        const orderRef = await db.collection('orders').add(orderData);

        // Atomically deduct tokens (reserve + commit in one transaction) and write ledger/reservation
        const reservationId = `cashFee_order_${orderRef.id}`;
        const reserveTxId = `reserve_${reservationId}`;
        const commitTxId = `commit_${reservationId}`;

        await db.runTransaction(async (tx) => {
          const walletRef = db.doc(`tokenWallets/${request.auth!.uid}`);
          const walletSnap = await tx.get(walletRef);

          const current = walletSnap.exists ? (walletSnap.data() as any) : { available: 0, reserved: 0, lifetimePurchased: 0, lifetimeSpent: 0, lifetimeAdjusted: 0 };
          const available = Number(current.available || 0);
          if (available < requiredTokenCharge) {
            throw new functions.https.HttpsError('failed-precondition', 'Insufficient tokens for external payment');
          }

          // Update wallet: available decreases, lifetimeSpent increases (reserved remains unchanged overall)
          const nextWallet = {
            available: available - requiredTokenCharge,
            reserved: Number(current.reserved || 0),
            lifetimePurchased: Number(current.lifetimePurchased || 0),
            lifetimeSpent: Number(current.lifetimeSpent || 0) + requiredTokenCharge,
            lifetimeAdjusted: Number(current.lifetimeAdjusted || 0),
            updatedAt: FieldValue.serverTimestamp(),
          };

          tx.set(walletRef, nextWallet, { merge: true });

          // Write reservation (mark as committed)
          const reservationRef = db.doc(`tokenReservations/${reservationId}`);
          tx.set(reservationRef, {
            uid: request.auth!.uid,
            action: 'cash_fee',
            amount: requiredTokenCharge,
            status: 'committed',
            idempotencyKey: reservationId,
            metadata: { orderId: orderRef.id },
            actorUid: request.auth!.uid,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            committedAt: FieldValue.serverTimestamp(),
          }, { merge: true });

          // Write reserve + commit transactions for ledger parity
          tx.set(db.doc(`tokenTransactions/${reserveTxId}`), {
            uid: request.auth!.uid,
            type: 'reserve',
            actorType: 'customer',
            action: 'cash_fee',
            amount: requiredTokenCharge,
            idempotencyKey: reservationId,
            reservationId,
            metadata: { orderId: orderRef.id },
            createdAt: FieldValue.serverTimestamp(),
          }, { merge: true });

          tx.set(db.doc(`tokenTransactions/${commitTxId}`), {
            uid: request.auth!.uid,
            type: 'commit',
            actorType: 'customer',
            action: 'cash_fee',
            amount: requiredTokenCharge,
            idempotencyKey: `commit_${reservationId}`,
            reservationId,
            metadata: { orderId: orderRef.id },
            createdAt: FieldValue.serverTimestamp(),
          }, { merge: true });

          // Annotate order with token charge info
          tx.update(orderRef, {
            tokensCharged: requiredTokenCharge,
            tokenReservationId: reservationId,
            tokenChargedAt: FieldValue.serverTimestamp(),
          });
        });

        // debug: read reservation after transaction commit
        const reservationCheck = await db.doc(`tokenReservations/${reservationId}`).get();
        console.log('DEBUG: reservation after commit visible:', reservationCheck.exists, reservationId);

        // Update inventory for each item (same as Stripe flow)
        for (const item of items) {
          const itemRef = db.collection('marketplaceItems').doc(item.itemId);
          await db.runTransaction(async (transaction) => {
            const itemDoc = await transaction.get(itemRef);
            if (itemDoc.exists) {
              const currentStock = itemDoc.data()?.stock || 0;
              const newStock = Math.max(0, currentStock - item.quantity);
              transaction.update(itemRef, {
                stock: newStock,
                updatedAt: FieldValue.serverTimestamp(),
              });
            }
          });
        }

        console.log(`External order created: ${orderRef.id} (charged ${requiredTokenCharge} tokens) for user ${request.auth.uid}`);

        return {
          orderId: orderRef.id,
          status: 'external_pending',
          tokensCharged: requiredTokenCharge,
        };
      }

      // Default: Stripe payment flow
      const stripe = await getStripeClient();
      
      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // Already in cents from client
        currency: currency.toLowerCase(),
        payment_method: paymentMethodId,
        confirm: true,
        return_url: `${request.rawRequest.headers.origin}/orders`,
        metadata: {
          userId: request.auth.uid,
          orderType: 'marketplace',
        },
      });

      // Create order in Firestore
      const timestamp = FieldValue.serverTimestamp();
      
      const orderData = {
        customerId: request.auth.uid,
        customerEmail: shippingInfo.email,
        items: items.map(item => ({
          itemId: item.itemId,
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          vendorId: item.vendorId,
        })),
        shippingInfo: {
          fullName: shippingInfo.fullName,
          email: shippingInfo.email,
          phone: shippingInfo.phone,
          address: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          zipCode: shippingInfo.zipCode,
          country: shippingInfo.country,
        },
        subtotal: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        shipping: 0, // Free shipping
        tax: amount / 100 - items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        total: amount / 100,
        paymentIntentId: paymentIntent.id,
        paymentStatus: paymentIntent.status,
        status: 'pending',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const orderRef = await db.collection('orders').add(orderData);

      // Update inventory for each item
      for (const item of items) {
        const itemRef = db.collection('marketplaceItems').doc(item.itemId);
        await db.runTransaction(async (transaction) => {
          const itemDoc = await transaction.get(itemRef);
          if (itemDoc.exists) {
            const currentStock = itemDoc.data()?.stock || 0;
            const newStock = Math.max(0, currentStock - item.quantity);
            transaction.update(itemRef, {
              stock: newStock,
              updatedAt: timestamp,
            });
          }
        });
      }

      console.log(`Order created: ${orderRef.id} for user ${request.auth.uid}`);

      return {
        orderId: orderRef.id,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      };
    } catch (error) {
      console.error('Error creating marketplace order:', error);
      throw new functions.https.HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Failed to create order'
      );
    }
  }
);
