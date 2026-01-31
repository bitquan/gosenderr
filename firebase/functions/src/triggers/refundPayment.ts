import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getStripeClient } from "../stripe/stripeSecrets";

export const refundPayment = functions.firestore
  .document("deliveryJobs/{jobId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const jobId = context.params.jobId;

    // Check if status changed to 'cancelled'
    const statusChanged =
      before.status !== "cancelled" && after.status === "cancelled";

    // Check if payment is in authorized state (pre-authorized but not captured)
    const isPaymentAuthorized = after.paymentStatus === "authorized";

    if (!statusChanged || !isPaymentAuthorized) {
      return null;
    }

    const paymentIntentId = after.stripePaymentIntentId;

    if (!paymentIntentId) {
      console.error(`Job ${jobId}: Missing stripePaymentIntentId`);
      return null;
    }

    try {
      console.log(
        `Job ${jobId}: Cancelling payment intent ${paymentIntentId}`
      );

      // Cancel the payment intent (this releases the hold on the customer's card)
      const stripe = await getStripeClient();
      const paymentIntent = await stripe.paymentIntents.cancel(
        paymentIntentId
      );

      console.log(
        `Job ${jobId}: Payment intent cancelled successfully. Status: ${paymentIntent.status}`
      );

      // Update job document
      await admin.firestore().collection("deliveryJobs").doc(jobId).update({
        "paymentStatus": "refunded",
        "paymentDetails.refundedAt": admin.firestore.FieldValue.serverTimestamp(),
        "paymentDetails.refundReason": "Job cancelled before delivery",
        "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Job ${jobId}: Payment status updated to refunded`);

      return {success: true, paymentIntentId};
    } catch (error: any) {
      console.error(`Job ${jobId}: Error cancelling payment:`, error);

      // Update job with error information
      await admin.firestore().collection("deliveryJobs").doc(jobId).update({
        "paymentStatus": "refund_failed",
        "paymentDetails.refundError": error.message,
        "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
      });

      return {success: false, error: error.message};
    }
  });
