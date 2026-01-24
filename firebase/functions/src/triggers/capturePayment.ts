import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

function getStripe() {
  const config = functions.config();
  const apiKey = config.stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(apiKey, {
    apiVersion: "2025-02-24.acacia",
  });
}

export const capturePayment = functions.firestore
  .document("deliveryJobs/{jobId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const jobId = context.params.jobId;

    // Check if customerConfirmation.received changed to true
    const confirmationChanged =
      !before.customerConfirmation?.received &&
      after.customerConfirmation?.received === true;

    // Check if payment is in authorized state
    const isPaymentAuthorized = after.paymentStatus === "authorized";

    if (!confirmationChanged || !isPaymentAuthorized) {
      return null;
    }

    const paymentIntentId = after.stripePaymentIntentId;

    if (!paymentIntentId) {
      console.error(`Job ${jobId}: Missing stripePaymentIntentId`);
      return null;
    }

    try {
      console.log(
        `Job ${jobId}: Capturing payment intent ${paymentIntentId}`
      );

      // Capture the payment
      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.capture(
        paymentIntentId
      );

      console.log(
        `Job ${jobId}: Payment captured successfully. Status: ${paymentIntent.status}`
      );

      // Update job document
      await admin.firestore().collection("deliveryJobs").doc(jobId).update({
        "paymentStatus": "captured",
        "paymentDetails.capturedAt": admin.firestore.FieldValue.serverTimestamp(),
        "paymentDetails.captureAmount": paymentIntent.amount_received,
        "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Job ${jobId}: Payment status updated to captured`);

      return {success: true, paymentIntentId};
    } catch (error: any) {
      console.error(`Job ${jobId}: Error capturing payment:`, error);

      // Update job with error information
      await admin.firestore().collection("deliveryJobs").doc(jobId).update({
        "paymentStatus": "capture_failed",
        "paymentDetails.captureError": error.message,
        "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });

      return {success: false, error: error.message};
    }
  });
