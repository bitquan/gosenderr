import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-12-15.clover",
  });
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 },
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session, stripe);
        break;
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent, stripe);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 },
    );
  }
}

async function handleCheckoutComplete(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
) {
  console.log("Processing checkout.session.completed:", session.id);

  // Find the marketplace order by checkoutSessionId
  const ordersSnapshot = await db
    .collection("marketplaceOrders")
    .where("checkoutSessionId", "==", session.id)
    .limit(1)
    .get();

  if (ordersSnapshot.empty) {
    console.error("No marketplace order found for session:", session.id);
    return;
  }

  const orderDoc = ordersSnapshot.docs[0];
  const orderData = orderDoc.data();

  // Check if order is for delivery (not pickup)
  if (orderData.deliveryMethod === "pickup") {
    // For pickup orders, just update status to pending_pickup
    await orderDoc.ref.update({
      status: "pending_pickup",
      paymentStatus: "paid",
      paymentIntentId: session.payment_intent,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log("Pickup order marked as paid:", orderDoc.id);
    return;
  }

  // For delivery orders, create a delivery job
  const itemDoc = await db.collection("items").doc(orderData.itemId).get();
  if (!itemDoc.exists) {
    console.error("Item not found:", orderData.itemId);
    return;
  }

  const itemData = itemDoc.data();

  // Create job in the "jobs" collection that couriers watch
  const jobData = {
    createdByUid: orderData.buyerId,
    courierUid: orderData.courierId || null, // Pre-selected courier
    agreedFee: orderData.deliveryFee || null,
    status: orderData.courierId ? "assigned" : "open", // If courier pre-selected, mark as assigned
    pickup: {
      lat: itemData?.pickupLocation?.lat || 0,
      lng: itemData?.pickupLocation?.lng || 0,
      label: itemData?.pickupLocation?.address || "Pickup location",
    },
    dropoff: {
      lat: orderData.dropoffAddress?.lat || 0,
      lng: orderData.dropoffAddress?.lng || 0,
      label: orderData.dropoffAddress?.address || "Dropoff location",
    },
    package: {
      size: itemData?.isFoodItem ? "small" : "medium",
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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const jobRef = await db.collection("jobs").add(jobData);

  // Update marketplace order with payment details and job reference
  await orderDoc.ref.update({
    status: "paid",
    paymentStatus: "paid",
    paymentIntentId: session.payment_intent,
    jobId: jobRef.id,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`Created job ${jobRef.id} for marketplace order ${orderDoc.id}`);
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  stripe: Stripe,
) {
  console.log("Processing payment_intent.succeeded:", paymentIntent.id);

  // Check if this payment has courier info for 3-way split
  const hasCourierStripe = paymentIntent.metadata?.hasCourierStripe === "true";
  const courierStripeAccountId = paymentIntent.metadata?.courierStripeAccountId;
  const deliveryFee = paymentIntent.metadata?.deliveryFee;

  if (!hasCourierStripe || !courierStripeAccountId || !deliveryFee) {
    console.log("No courier transfer needed for this payment");
    return;
  }

  try {
    // Transfer delivery fee to courier
    const deliveryFeeAmount = Math.round(Number(deliveryFee) * 100);

    const transfer = await stripe.transfers.create({
      amount: deliveryFeeAmount,
      currency: "usd",
      destination: courierStripeAccountId,
      transfer_group: paymentIntent.id,
      description: `Delivery fee for payment ${paymentIntent.id}`,
      metadata: {
        paymentIntentId: paymentIntent.id,
        type: "courier_delivery_fee",
      },
    });

    console.log(
      `✅ Transferred $${deliveryFee} to courier ${courierStripeAccountId}`,
      {
        transferId: transfer.id,
        paymentIntentId: paymentIntent.id,
      },
    );

    // Update marketplace order with transfer info
    const ordersSnapshot = await db
      .collection("marketplaceOrders")
      .where("paymentIntentId", "==", paymentIntent.id)
      .limit(1)
      .get();

    if (!ordersSnapshot.empty) {
      const orderDoc = ordersSnapshot.docs[0];
      await orderDoc.ref.update({
        courierTransferId: transfer.id,
        courierPaymentStatus: "transferred",
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`Updated order ${orderDoc.id} with courier transfer info`);
    }
  } catch (error: any) {
    console.error("❌ Failed to transfer to courier:", error);
    // Log error but don't fail the webhook
    // TODO: Set up retry logic or alert system
  }
}
