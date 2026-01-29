import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';

// Ensure admin is initialized (safe to call multiple times)
if (!admin.apps.length) {
  admin.initializeApp();
}

function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(apiKey, {
    apiVersion: '2025-02-24.acacia',
  });
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
  paymentMethodId: string;
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
      const stripe = getStripe();
      
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
