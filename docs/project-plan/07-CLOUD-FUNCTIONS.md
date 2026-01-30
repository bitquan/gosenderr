# Cloud Functions API

**Last Updated:** January 2026  
**Runtime:** Node.js 20  
**Region:** us-central1

---

## 📋 Overview

Firebase Cloud Functions provide the backend API for GoSenderr v2. These serverless functions handle business logic, payments, notifications, and data validation that cannot be done securely on the client.

**Key Principles:**
- Secure server-side validation
- Atomic transactions for critical operations
- Idempotent operations (safe to retry)
- Comprehensive error handling
- Structured logging for debugging

---

## 🗂️ Function Categories

```
functions/
├── src/
│   ├── marketplace/
│   │   ├── createOrder.ts
│   │   ├── updateOrderStatus.ts
│   │   ├── cancelOrder.ts
│   │   └── calculateDeliveryFee.ts
│   ├── jobs/
│   │   ├── claimJob.ts
│   │   ├── updateJobStatus.ts
│   │   ├── completeDelivery.ts
│   │   └── uploadJobPhoto.ts
│   ├── payments/
│   │   ├── createPaymentIntent.ts
│   │   ├── handleStripeWebhook.ts
│   │   ├── createPayout.ts
│   │   └── processPayouts.ts
│   ├── notifications/
│   │   ├── sendPushNotification.ts
│   │   ├── sendEmail.ts
│   │   └── sendSMS.ts
│   ├── messaging/
│   │   ├── createConversation.ts
│   │   └── sendMessage.ts
│   ├── ratings/
│   │   ├── submitRating.ts
│   │   └── calculateUserRating.ts
│   ├── admin/
│   │   ├── banUser.ts
│   │   ├── resolveDispute.ts
│   │   ├── getAnalytics.ts
│   │   └── exportData.ts
│   ├── triggers/
│   │   ├── onOrderCreated.ts
│   │   ├── onJobClaimed.ts
│   │   ├── onJobCompleted.ts
│   │   └── onUserCreated.ts
│   ├── scheduled/
│   │   ├── cleanupExpiredJobs.ts
│   │   ├── processScheduledPayouts.ts
│   │   └── generateDailyReports.ts
│   └── utils/
│       ├── validation.ts
│       ├── stripe.ts
│       ├── twilio.ts
│       └── sendgrid.ts
├── package.json
└── tsconfig.json
```

---

## 🛒 Marketplace Functions

### createOrder

**Purpose:** Create a new marketplace order with payment processing

**Trigger:** HTTPS Callable  
**Auth:** Required

```typescript
import { https, logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import Stripe from 'stripe';

const db = getFirestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface CreateOrderRequest {
  itemId: string;
  quantity: number;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    location: { latitude: number; longitude: number };
    instructions?: string;
  };
  deliveryOption: 'standard' | 'express' | 'pickup';
  paymentMethodId: string;
}

interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  paymentIntentId: string;
  clientSecret: string;
}

export const createOrder = https.onCall(
  { cors: true },
  async (request): Promise<CreateOrderResponse> => {
    // 1. Validate authentication
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const buyerId = request.auth.uid;
    const data = request.data as CreateOrderRequest;
    
    // 2. Validate input
    if (!data.itemId || !data.quantity || data.quantity < 1) {
      throw new https.HttpsError('invalid-argument', 'Invalid item or quantity');
    }
    
    if (!data.deliveryAddress || !data.paymentMethodId) {
      throw new https.HttpsError('invalid-argument', 'Missing required fields');
    }
    
    // 3. Get item details
    const itemRef = db.collection('marketplaceItems').doc(data.itemId);
    const itemSnap = await itemRef.get();
    
    if (!itemSnap.exists) {
      throw new https.HttpsError('not-found', 'Item not found');
    }
    
    const item = itemSnap.data()!;
    
    // 4. Validate item availability
    if (!item.isActive || item.status !== 'active') {
      throw new https.HttpsError('failed-precondition', 'Item is not available');
    }
    
    if (item.availableQuantity < data.quantity) {
      throw new https.HttpsError('failed-precondition', 'Insufficient quantity available');
    }
    
    // 5. Get seller details
    const sellerRef = db.collection('users').doc(item.sellerId);
    const sellerSnap = await sellerRef.get();
    const seller = sellerSnap.data()!;
    
    // 6. Calculate pricing
    const itemPrice = item.price * data.quantity;
    const deliveryFee = await calculateDeliveryFee(
      item.pickupLocation,
      data.deliveryAddress.location,
      data.deliveryOption
    );
    const serviceFee = Math.round(itemPrice * 0.03); // 3% service fee
    const platformFee = Math.round((itemPrice + deliveryFee) * 0.15); // 15% platform fee
    const taxAmount = Math.round((itemPrice + deliveryFee + serviceFee) * 0.0875); // 8.75% tax
    const totalAmount = itemPrice + deliveryFee + serviceFee + taxAmount;
    const sellerPayout = itemPrice - platformFee;
    
    // 7. Get customer Stripe ID or create
    const buyerRef = db.collection('users').doc(buyerId);
    const buyerSnap = await buyerRef.get();
    const buyer = buyerSnap.data()!;
    
    let stripeCustomerId = buyer.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: buyer.email,
        phone: buyer.phoneNumber,
        metadata: { userId: buyerId }
      });
      stripeCustomerId = customer.id;
      await buyerRef.update({ stripeCustomerId });
    }
    
    // 8. Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      customer: stripeCustomerId,
      payment_method: data.paymentMethodId,
      confirm: false,
      capture_method: 'manual', // Capture after delivery
      metadata: {
        buyerId,
        sellerId: item.sellerId,
        itemId: data.itemId,
        orderType: 'marketplace'
      }
    });
    
    // 9. Generate order number
    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // 10. Create order document
    const orderRef = db.collection('orders').doc();
    const orderData = {
      id: orderRef.id,
      orderNumber,
      
      // Parties
      buyerId,
      buyerName: buyer.displayName,
      buyerPhotoURL: buyer.photoURL || null,
      
      sellerId: item.sellerId,
      sellerName: seller.displayName,
      sellerPhotoURL: seller.photoURL || null,
      
      // Item
      itemId: data.itemId,
      itemSnapshot: {
        title: item.title,
        price: item.price,
        photos: item.photos,
        condition: item.condition,
        category: item.category
      },
      quantity: data.quantity,
      
      // Delivery
      deliveryAddress: data.deliveryAddress,
      deliveryOption: data.deliveryOption,
      deliveryInstructions: data.deliveryAddress.instructions || null,
      
      pickupAddress: {
        street: item.pickupAddress,
        city: item.pickupCity,
        state: item.pickupState,
        location: item.pickupLocation
      },
      
      // Pricing
      itemPrice,
      deliveryFee,
      serviceFee,
      platformFee,
      taxAmount,
      totalAmount,
      sellerPayout,
      platformEarnings: platformFee,
      
      // Payment
      paymentIntentId: paymentIntent.id,
      paymentStatus: 'pending',
      paymentMethod: `****${data.paymentMethodId.slice(-4)}`,
      
      // Status
      status: 'pending',
      
      // Timestamps
      placedAt: Timestamp.now(),
      estimatedDeliveryAt: Timestamp.fromMillis(
        Date.now() + (data.deliveryOption === 'express' ? 2 : 4) * 60 * 60 * 1000
      ),
      
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    await orderRef.set(orderData);
    
    // 11. Update item quantity
    await itemRef.update({
      availableQuantity: FieldValue.increment(-data.quantity),
      soldCount: FieldValue.increment(data.quantity)
    });
    
    // 12. Log success
    logger.info('Order created', {
      orderId: orderRef.id,
      buyerId,
      sellerId: item.sellerId,
      totalAmount
    });
    
    return {
      orderId: orderRef.id,
      orderNumber,
      totalAmount,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!
    };
  }
);

// Helper function
async function calculateDeliveryFee(
  pickupLocation: { latitude: number; longitude: number },
  dropoffLocation: { latitude: number; longitude: number },
  deliveryOption: string
): Promise<number> {
  // Calculate distance using Haversine formula
  const R = 3959; // Earth's radius in miles
  const dLat = (dropoffLocation.latitude - pickupLocation.latitude) * Math.PI / 180;
  const dLon = (dropoffLocation.longitude - pickupLocation.longitude) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(pickupLocation.latitude * Math.PI / 180) * 
            Math.cos(dropoffLocation.latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distanceMiles = R * c;
  
  // Base fee + per-mile fee
  let baseFee = 500; // $5.00
  const perMileFee = 150; // $1.50 per mile
  
  if (deliveryOption === 'express') {
    baseFee *= 1.5; // 50% premium for express
  }
  
  const totalFee = baseFee + Math.round(distanceMiles * perMileFee);
  
  return Math.max(totalFee, 500); // Minimum $5.00
}
```

---

### cancelOrder

**Purpose:** Cancel an order and process refund if applicable

**Trigger:** HTTPS Callable  
**Auth:** Required

```typescript
interface CancelOrderRequest {
  orderId: string;
  reason: string;
}

export const cancelOrder = https.onCall(
  { cors: true },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const userId = request.auth.uid;
    const { orderId, reason } = request.data as CancelOrderRequest;
    
    // Get order
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    
    if (!orderSnap.exists) {
      throw new https.HttpsError('not-found', 'Order not found');
    }
    
    const order = orderSnap.data()!;
    
    // Verify user is buyer or seller
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new https.HttpsError('permission-denied', 'Not authorized to cancel this order');
    }
    
    // Check if order can be cancelled
    if (!['pending', 'accepted', 'ready_for_pickup'].includes(order.status)) {
      throw new https.HttpsError('failed-precondition', 'Order cannot be cancelled at this stage');
    }
    
    // Process refund if payment was captured
    if (order.paymentStatus === 'captured') {
      await stripe.refunds.create({
        payment_intent: order.paymentIntentId,
        reason: 'requested_by_customer'
      });
    }
    
    // Update order
    await orderRef.update({
      status: 'cancelled',
      paymentStatus: order.paymentStatus === 'captured' ? 'refunded' : 'pending',
      cancellationReason: reason,
      cancelledBy: userId,
      cancelledAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    // Restore item quantity
    await db.collection('marketplaceItems').doc(order.itemId).update({
      availableQuantity: FieldValue.increment(order.quantity)
    });
    
    // Send notifications
    await sendOrderCancellationNotifications(order, userId, reason);
    
    logger.info('Order cancelled', { orderId, userId, reason });
    
    return { success: true };
  }
);
```

---

## 🚚 Job Functions

### claimJob

**Purpose:** Atomically claim a delivery job (prevents double-claiming)

**Trigger:** HTTPS Callable  
**Auth:** Required (Courier only)

```typescript
interface ClaimJobRequest {
  jobId: string;
}

interface ClaimJobResponse {
  success: boolean;
  job?: any;
  reason?: string;
}

export const claimJob = https.onCall(
  { cors: true },
  async (request): Promise<ClaimJobResponse> => {
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const courierId = request.auth.uid;
    const { jobId } = request.data as ClaimJobRequest;
    
    // Verify user is a courier
    const courierRef = db.collection('users').doc(courierId);
    const courierSnap = await courierRef.get();
    const courier = courierSnap.data()!;
    
    if (!courier.roles.includes('courier')) {
      throw new https.HttpsError('permission-denied', 'User is not a courier');
    }
    
    if (!courier.courierProfile?.isActive || !courier.courierProfile?.isOnline) {
      throw new https.HttpsError('failed-precondition', 'Courier is not active or online');
    }
    
    // Check if courier already has an active job
    if (courier.courierProfile.activeJobId) {
      throw new https.HttpsError('failed-precondition', 'Courier already has an active job');
    }
    
    // Use transaction to atomically claim job
    const jobRef = db.collection('jobs').doc(jobId);
    
    try {
      const result = await db.runTransaction(async (transaction) => {
        const jobDoc = await transaction.get(jobRef);
        
        if (!jobDoc.exists) {
          return { success: false, reason: 'Job not found' };
        }
        
        const job = jobDoc.data()!;
        
        // Check if job is available
        if (job.status !== 'available') {
          return { success: false, reason: 'Job is no longer available' };
        }
        
        if (job.courierId) {
          return { success: false, reason: 'Job already claimed by another courier' };
        }
        
        // Claim the job
        transaction.update(jobRef, {
          courierId,
          courierName: courier.displayName,
          courierPhone: courier.phoneNumber,
          status: 'claimed',
          claimedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        
        // Update courier's active job
        transaction.update(courierRef, {
          'courierProfile.activeJobId': jobId,
          'courierProfile.status': 'busy',
          updatedAt: Timestamp.now()
        });
        
        // Update related order
        const orderRef = db.collection('orders').doc(job.orderId);
        transaction.update(orderRef, {
          courierId,
          courierName: courier.displayName,
          courierPhotoURL: courier.photoURL || null,
          status: 'claimed',
          claimedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        
        return { success: true, job: { ...job, id: jobDoc.id } };
      });
      
      if (result.success) {
        // Send notifications
        await sendJobClaimedNotifications(result.job!, courierId);
        
        logger.info('Job claimed', { jobId, courierId });
      }
      
      return result;
    } catch (error) {
      logger.error('Job claim failed', { jobId, courierId, error });
      throw new https.HttpsError('internal', 'Failed to claim job');
    }
  }
);
```

---

### updateJobStatus

**Purpose:** Update job status during delivery

**Trigger:** HTTPS Callable  
**Auth:** Required (Courier only)

```typescript
interface UpdateJobStatusRequest {
  jobId: string;
  status: 'arrived_at_pickup' | 'picked_up' | 'in_transit' | 'arrived_at_dropoff' | 'delivered';
  location?: { latitude: number; longitude: number };
}

export const updateJobStatus = https.onCall(
  { cors: true },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const courierId = request.auth.uid;
    const { jobId, status, location } = request.data as UpdateJobStatusRequest;
    
    const jobRef = db.collection('jobs').doc(jobId);
    const jobSnap = await jobRef.get();
    
    if (!jobSnap.exists) {
      throw new https.HttpsError('not-found', 'Job not found');
    }
    
    const job = jobSnap.data()!;
    
    // Verify courier owns this job
    if (job.courierId !== courierId) {
      throw new https.HttpsError('permission-denied', 'Not authorized for this job');
    }
    
    // Validate status transition
    const validTransitions: { [key: string]: string[] } = {
      'claimed': ['arrived_at_pickup'],
      'arrived_at_pickup': ['picked_up'],
      'picked_up': ['in_transit'],
      'in_transit': ['arrived_at_dropoff'],
      'arrived_at_dropoff': ['delivered']
    };
    
    if (!validTransitions[job.status]?.includes(status)) {
      throw new https.HttpsError('failed-precondition', 'Invalid status transition');
    }
    
    // Prepare update
    const update: any = {
      status,
      updatedAt: Timestamp.now()
    };
    
    // Add timestamp field based on status
    const timestampField = `${status.replace(/_([a-z])/g, (_, l) => l.toUpperCase())}At`;
    update[timestampField] = Timestamp.now();
    
    if (location) {
      update.courierLocation = new admin.firestore.GeoPoint(
        location.latitude,
        location.longitude
      );
      update.lastLocationUpdate = Timestamp.now();
    }
    
    // Update job
    await jobRef.update(update);
    
    // Update related order
    const orderUpdate: any = {
      status,
      updatedAt: Timestamp.now()
    };
    orderUpdate[timestampField] = Timestamp.now();
    
    await db.collection('orders').doc(job.orderId).update(orderUpdate);
    
    // Send notifications
    await sendJobStatusUpdateNotifications(job, status);
    
    logger.info('Job status updated', { jobId, status, courierId });
    
    return { success: true };
  }
);
```

---

### completeDelivery

**Purpose:** Complete delivery, capture payment, and initiate payouts

**Trigger:** HTTPS Callable  
**Auth:** Required (Courier only)

```typescript
interface CompleteDeliveryRequest {
  jobId: string;
  deliveryPhotoId: string;
  notes?: string;
}

export const completeDelivery = https.onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; earnings: number }> => {
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const courierId = request.auth.uid;
    const { jobId, deliveryPhotoId, notes } = request.data as CompleteDeliveryRequest;
    
    const jobRef = db.collection('jobs').doc(jobId);
    const jobSnap = await jobRef.get();
    
    if (!jobSnap.exists) {
      throw new https.HttpsError('not-found', 'Job not found');
    }
    
    const job = jobSnap.data()!;
    
    if (job.courierId !== courierId) {
      throw new https.HttpsError('permission-denied', 'Not authorized');
    }
    
    if (job.status !== 'delivered') {
      throw new https.HttpsError('failed-precondition', 'Job must be in delivered status');
    }
    
    // Verify delivery photo exists
    const photoSnap = await db.collection('jobPhotos').doc(deliveryPhotoId).get();
    if (!photoSnap.exists) {
      throw new https.HttpsError('not-found', 'Delivery photo not found');
    }
    
    const orderRef = db.collection('orders').doc(job.orderId);
    const orderSnap = await orderRef.get();
    const order = orderSnap.data()!;
    
    // Capture payment
    try {
      await stripe.paymentIntents.capture(order.paymentIntentId);
    } catch (error) {
      logger.error('Payment capture failed', { orderId: job.orderId, error });
      throw new https.HttpsError('internal', 'Failed to capture payment');
    }
    
    // Update job
    await jobRef.update({
      status: 'completed',
      deliveryPhotoId,
      completedAt: Timestamp.now(),
      notes: notes || null,
      updatedAt: Timestamp.now()
    });
    
    // Update order
    await orderRef.update({
      status: 'delivered',
      paymentStatus: 'captured',
      deliveredAt: Timestamp.now(),
      actualDeliveryAt: Timestamp.now(),
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    // Update courier earnings
    const courierRef = db.collection('users').doc(courierId);
    await courierRef.update({
      'courierProfile.totalDeliveries': FieldValue.increment(1),
      'courierProfile.totalEarnings': FieldValue.increment(job.courierPay),
      'courierProfile.pendingEarnings': FieldValue.increment(job.courierPay),
      'courierProfile.activeJobId': null,
      'courierProfile.status': 'available',
      updatedAt: Timestamp.now()
    });
    
    // Send completion notifications
    await sendDeliveryCompletionNotifications(order, job);
    
    logger.info('Delivery completed', { 
      jobId, 
      orderId: job.orderId, 
      courierId,
      earnings: job.courierPay 
    });
    
    return { 
      success: true,
      earnings: job.courierPay
    };
  }
);
```

---

### uploadJobPhoto

**Purpose:** Upload and associate proof photo with job

**Trigger:** HTTPS Callable  
**Auth:** Required (Courier only)

```typescript
import { getStorage } from 'firebase-admin/storage';

interface UploadJobPhotoRequest {
  jobId: string;
  photoType: 'pickup' | 'delivery';
  photoDataUrl: string; // base64 encoded
}

interface UploadJobPhotoResponse {
  photoId: string;
  photoURL: string;
  thumbnailURL: string;
}

export const uploadJobPhoto = https.onCall(
  { cors: true },
  async (request): Promise<UploadJobPhotoResponse> => {
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const courierId = request.auth.uid;
    const { jobId, photoType, photoDataUrl } = request.data as UploadJobPhotoRequest;
    
    // Verify job ownership
    const jobSnap = await db.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) {
      throw new https.HttpsError('not-found', 'Job not found');
    }
    
    const job = jobSnap.data()!;
    if (job.courierId !== courierId) {
      throw new https.HttpsError('permission-denied', 'Not authorized');
    }
    
    // Parse base64 data
    const matches = photoDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new https.HttpsError('invalid-argument', 'Invalid photo data');
    }
    
    const imageType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generate filename
    const timestamp = Date.now();
    const filename = `jobs/${jobId}/${photoType}_${timestamp}.${imageType}`;
    const thumbnailFilename = `jobs/${jobId}/${photoType}_${timestamp}_thumb.${imageType}`;
    
    // Upload to Cloud Storage
    const bucket = getStorage().bucket();
    const file = bucket.file(filename);
    const thumbnailFile = bucket.file(thumbnailFilename);
    
    await file.save(buffer, {
      contentType: `image/${imageType}`,
      metadata: {
        metadata: {
          jobId,
          courierId,
          photoType,
          uploadedAt: new Date().toISOString()
        }
      }
    });
    
    // TODO: Generate thumbnail (use Sharp library)
    // For now, just use same image
    await thumbnailFile.save(buffer, {
      contentType: `image/${imageType}`
    });
    
    // Make files publicly readable
    await file.makePublic();
    await thumbnailFile.makePublic();
    
    const photoURL = `https://storage.googleapis.com/${bucket.name}/${filename}`;
    const thumbnailURL = `https://storage.googleapis.com/${bucket.name}/${thumbnailFilename}`;
    
    // Create photo document
    const photoRef = db.collection('jobPhotos').doc();
    await photoRef.set({
      id: photoRef.id,
      jobId,
      orderId: job.orderId,
      courierId,
      photoType,
      photoURL,
      thumbnailURL,
      timestamp: Timestamp.now(),
      isVerified: false,
      createdAt: Timestamp.now()
    });
    
    // Update job with photo reference
    const photoField = `${photoType}PhotoId`;
    await db.collection('jobs').doc(jobId).update({
      [photoField]: photoRef.id,
      updatedAt: Timestamp.now()
    });
    
    logger.info('Job photo uploaded', { 
      jobId, 
      photoId: photoRef.id, 
      photoType 
    });
    
    return {
      photoId: photoRef.id,
      photoURL,
      thumbnailURL
    };
  }
);
```

---

## 💳 Payment Functions

### createPayout

**Purpose:** Create payout for courier or seller

**Trigger:** HTTPS Callable  
**Auth:** Required (Admin only)

```typescript
interface CreatePayoutRequest {
  userId: string;
  userRole: 'courier' | 'seller';
  amount?: number; // If not provided, payout all available
  jobIds?: string[];
  orderIds?: string[];
}

export const createPayout = https.onCall(
  { cors: true, enforceAppCheck: true },
  async (request): Promise<{ payoutId: string; amount: number }> => {
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    // Verify admin
    const adminSnap = await db.collection('users').doc(request.auth.uid).get();
    const admin = adminSnap.data()!;
    if (!admin.roles.includes('admin')) {
      throw new https.HttpsError('permission-denied', 'Admin access required');
    }
    
    const { userId, userRole, amount, jobIds, orderIds } = request.data as CreatePayoutRequest;
    
    // Get user
    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists) {
      throw new https.HttpsError('not-found', 'User not found');
    }
    
    const user = userSnap.data()!;
    
    // Determine available balance and Stripe account
    let availableAmount: number;
    let stripeAccountId: string;
    
    if (userRole === 'courier') {
      if (!user.courierProfile) {
        throw new https.HttpsError('failed-precondition', 'User is not a courier');
      }
      availableAmount = user.courierProfile.availableForPayout || 0;
      stripeAccountId = user.courierProfile.stripeConnectAccountId;
    } else {
      if (!user.sellerProfile) {
        throw new https.HttpsError('failed-precondition', 'User is not a seller');
      }
      availableAmount = user.sellerProfile.availableForPayout || 0;
      stripeAccountId = user.sellerProfile.stripeConnectAccountId;
    }
    
    if (!stripeAccountId) {
      throw new https.HttpsError('failed-precondition', 'User has not set up payouts');
    }
    
    // Determine payout amount
    const payoutAmount = amount || availableAmount;
    
    if (payoutAmount <= 0) {
      throw new https.HttpsError('failed-precondition', 'No funds available for payout');
    }
    
    if (payoutAmount > availableAmount) {
      throw new https.HttpsError('failed-precondition', 'Insufficient funds');
    }
    
    // Create Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: payoutAmount,
      currency: 'usd',
      destination: stripeAccountId,
      metadata: {
        userId,
        userRole,
        jobIds: jobIds?.join(',') || '',
        orderIds: orderIds?.join(',') || ''
      }
    });
    
    // Generate payout number
    const payoutNumber = `PAY-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Create payout document
    const payoutRef = db.collection('payouts').doc();
    await payoutRef.set({
      id: payoutRef.id,
      payoutNumber,
      userId,
      userRole,
      amount: payoutAmount,
      currency: 'usd',
      jobIds: jobIds || [],
      orderIds: orderIds || [],
      stripePayoutId: transfer.id,
      stripeAccountId,
      status: 'in_transit',
      description: `Payout for ${jobIds?.length || 0} jobs and ${orderIds?.length || 0} orders`,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      scheduledAt: Timestamp.now()
    });
    
    // Update user balance
    const profileField = userRole === 'courier' ? 'courierProfile' : 'sellerProfile';
    await db.collection('users').doc(userId).update({
      [`${profileField}.availableForPayout`]: FieldValue.increment(-payoutAmount),
      updatedAt: Timestamp.now()
    });
    
    // Send notification
    await sendPayoutNotification(userId, payoutAmount);
    
    logger.info('Payout created', { 
      payoutId: payoutRef.id, 
      userId, 
      amount: payoutAmount 
    });
    
    return {
      payoutId: payoutRef.id,
      amount: payoutAmount
    };
  }
);
```

---

## 📬 Notification Functions

### sendPushNotification

**Purpose:** Send push notification to user device(s)

**Trigger:** HTTPS Callable  
**Auth:** Required (Internal/Admin)

```typescript
import { getMessaging } from 'firebase-admin/messaging';

interface SendPushNotificationRequest {
  userId: string;
  title: string;
  body: string;
  data?: { [key: string]: string };
  imageUrl?: string;
}

export const sendPushNotification = https.onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; messageId?: string }> => {
    const { userId, title, body, data, imageUrl } = request.data as SendPushNotificationRequest;
    
    // Get user's FCM tokens
    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists) {
      throw new https.HttpsError('not-found', 'User not found');
    }
    
    const user = userSnap.data()!;
    const fcmTokens = user.fcmTokens || [];
    
    if (fcmTokens.length === 0) {
      logger.warn('User has no FCM tokens', { userId });
      return { success: false };
    }
    
    // Construct message
    const message = {
      notification: {
        title,
        body,
        imageUrl
      },
      data: data || {},
      tokens: fcmTokens
    };
    
    // Send to all tokens
    const response = await getMessaging().sendEachForMulticast(message);
    
    // Remove invalid tokens
    if (response.failureCount > 0) {
      const tokensToRemove: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          tokensToRemove.push(fcmTokens[idx]);
        }
      });
      
      if (tokensToRemove.length > 0) {
        await db.collection('users').doc(userId).update({
          fcmTokens: FieldValue.arrayRemove(...tokensToRemove)
        });
      }
    }
    
    logger.info('Push notification sent', { 
      userId, 
      successCount: response.successCount,
      failureCount: response.failureCount
    });
    
    return { 
      success: response.successCount > 0,
      messageId: response.responses[0]?.messageId
    };
  }
);
```

---

## 🔔 Trigger Functions (Background)

### onOrderCreated

**Purpose:** Triggered when new order is created - send notifications and create job

**Trigger:** Firestore onCreate  
**Collection:** orders/

```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

export const onOrderCreated = onDocumentCreated(
  'orders/{orderId}',
  async (event) => {
    const order = event.data?.data();
    if (!order) return;
    
    const orderId = event.params.orderId;
    
    logger.info('Order created trigger', { orderId });
    
    // 1. Send notification to seller
    await sendPushNotification({
      userId: order.sellerId,
      title: '🛍️ New Order Received!',
      body: `${order.buyerName} ordered ${order.itemSnapshot.title}`,
      data: {
        type: 'new_order',
        orderId
      }
    });
    
    // 2. Send email to seller
    await sendEmail({
      to: order.sellerId,
      subject: 'New Order Received',
      template: 'new_order',
      data: { order }
    });
    
    // 3. Send confirmation to buyer
    await sendPushNotification({
      userId: order.buyerId,
      title: '✅ Order Confirmed',
      body: `Your order for ${order.itemSnapshot.title} has been placed`,
      data: {
        type: 'order_confirmation',
        orderId
      }
    });
    
    logger.info('Order created notifications sent', { orderId });
  }
);
```

---

### onJobClaimed

**Purpose:** Triggered when courier claims job - notify buyer and seller

**Trigger:** Firestore onUpdate  
**Collection:** jobs/

```typescript
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

export const onJobClaimed = onDocumentUpdated(
  'jobs/{jobId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    
    if (!before || !after) return;
    
    // Check if job was just claimed
    if (before.status === 'available' && after.status === 'claimed') {
      const jobId = event.params.jobId;
      
      logger.info('Job claimed trigger', { jobId, courierId: after.courierId });
      
      // Notify buyer
      await sendPushNotification({
        userId: after.recipientId,
        title: '🚚 Courier Assigned!',
        body: `${after.courierName} is picking up your order`,
        data: {
          type: 'job_claimed',
          jobId,
          orderId: after.orderId
        }
      });
      
      // Notify seller
      await sendPushNotification({
        userId: after.senderId,
        title: '🚚 Courier On The Way',
        body: `${after.courierName} will pick up the package soon`,
        data: {
          type: 'job_claimed',
          jobId,
          orderId: after.orderId
        }
      });
      
      logger.info('Job claimed notifications sent', { jobId });
    }
  }
);
```

---

## ⏱️ Scheduled Functions

### cleanupExpiredJobs

**Purpose:** Cancel jobs that haven't been claimed within timeout period

**Trigger:** Cloud Scheduler (every 5 minutes)

```typescript
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const cleanupExpiredJobs = onSchedule(
  'every 5 minutes',
  async () => {
    const now = Timestamp.now();
    
    // Find expired jobs
    const expiredJobsSnapshot = await db.collection('jobs')
      .where('status', '==', 'available')
      .where('expiresAt', '<=', now)
      .limit(100)
      .get();
    
    if (expiredJobsSnapshot.empty) {
      logger.info('No expired jobs found');
      return;
    }
    
    logger.info(`Found ${expiredJobsSnapshot.size} expired jobs`);
    
    // Process in batches
    const batch = db.batch();
    
    expiredJobsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'expired',
        updatedAt: Timestamp.now()
      });
      
      // Update related order
      const job = doc.data();
      const orderRef = db.collection('orders').doc(job.orderId);
      batch.update(orderRef, {
        status: 'cancelled',
        cancellationReason: 'No courier available',
        cancelledAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    });
    
    await batch.commit();
    
    logger.info(`Cleaned up ${expiredJobsSnapshot.size} expired jobs`);
  }
);
```

---

### processScheduledPayouts

**Purpose:** Process weekly courier payouts automatically

**Trigger:** Cloud Scheduler (every Monday at 9 AM)

```typescript
export const processScheduledPayouts = onSchedule(
  'every monday 09:00',
  async () => {
    logger.info('Processing scheduled payouts');
    
    // Find couriers with pending earnings >= $50
    const couriersSnapshot = await db.collection('users')
      .where('roles', 'array-contains', 'courier')
      .where('courierProfile.availableForPayout', '>=', 5000) // $50 minimum
      .get();
    
    logger.info(`Found ${couriersSnapshot.size} couriers eligible for payout`);
    
    const payoutPromises = couriersSnapshot.docs.map(async (doc) => {
      const courier = doc.data();
      const courierId = doc.id;
      
      try {
        await createPayout({
          userId: courierId,
          userRole: 'courier'
          // Amount will default to all available
        });
        
        logger.info('Payout created for courier', { courierId });
      } catch (error) {
        logger.error('Payout failed for courier', { courierId, error });
      }
    });
    
    await Promise.all(payoutPromises);
    
    logger.info('Scheduled payouts processing complete');
  }
);
```

---

## 🛡️ Security & Best Practices

### Input Validation

```typescript
import * as z from 'zod';

// Define schemas for validation
const CreateOrderSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().positive().max(100),
  deliveryAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().length(2),
    zipCode: z.string().regex(/^\d{5}$/),
    location: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    })
  }),
  deliveryOption: z.enum(['standard', 'express', 'pickup']),
  paymentMethodId: z.string().min(1)
});

// Use in function
export const createOrderValidated = https.onCall(
  { cors: true },
  async (request) => {
    // Validate input
    const validation = CreateOrderSchema.safeParse(request.data);
    if (!validation.success) {
      throw new https.HttpsError(
        'invalid-argument',
        validation.error.message
      );
    }
    
    // Proceed with validated data
    const data = validation.data;
    // ... rest of function
  }
);
```

---

### Rate Limiting

```typescript
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  points: 10, // Number of requests
  duration: 60, // Per 60 seconds
});

export const rateLimitedFunction = https.onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Auth required');
    }
    
    try {
      await rateLimiter.consume(request.auth.uid);
    } catch {
      throw new https.HttpsError(
        'resource-exhausted',
        'Too many requests. Please try again later.'
      );
    }
    
    // Proceed with function logic
  }
);
```

---

## 📊 Monitoring & Logging

### Structured Logging

```typescript
import { logger } from 'firebase-functions/v2';

// Log levels: debug, info, warn, error

// Good logging example
logger.info('Order created successfully', {
  orderId: 'order_123',
  buyerId: 'user_456',
  sellerId: 'user_789',
  amount: 5000,
  timestamp: new Date().toISOString()
});

// Error logging with context
logger.error('Payment capture failed', {
  orderId: 'order_123',
  paymentIntentId: 'pi_xxx',
  errorCode: error.code,
  errorMessage: error.message,
  stack: error.stack
});
```

---

## ✅ Testing Functions

### Local Emulator

```bash
# Start Firebase emulators
firebase emulators:start

# Test functions locally
curl -X POST http://localhost:5001/PROJECT_ID/us-central1/createOrder \
  -H "Content-Type: application/json" \
  -d '{"itemId": "item_123", "quantity": 1, ...}'
```

### Unit Tests

```typescript
import { expect } from 'chai';
import * as functions from 'firebase-functions-test';

const test = functions();

describe('createOrder', () => {
  it('should create order successfully', async () => {
    const data = {
      itemId: 'item_123',
      quantity: 1,
      // ... other fields
    };
    
    const wrapped = test.wrap(createOrder);
    const result = await wrapped(data, {
      auth: { uid: 'user_123' }
    });
    
    expect(result.orderId).to.be.a('string');
    expect(result.totalAmount).to.be.a('number');
  });
});
```

---

## 🚀 Deployment

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:createOrder

# Deploy function group
firebase deploy --only functions:marketplace

# View logs
firebase functions:log
firebase functions:log --only createOrder
```

---

*This completes the Cloud Functions API documentation for GoSenderr v2.*
