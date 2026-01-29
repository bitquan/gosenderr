import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const autoCancelExpiredFoodDeliveries = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.fromDate(new Date());

    try {
      // Find expired food deliveries
      const expiredJobs = await admin.firestore()
        .collection("deliveryJobs")
        .where("jobType", "==", "food")
        .where("status", "in", ["pending", "accepted", "in_transit"])
        .where("foodDeliveryDetails.autoCancelAt", "<=", now)
        .get();

      console.log(`Found ${expiredJobs.size} expired food deliveries`);

      for (const jobDoc of expiredJobs.docs) {
        const job = jobDoc.data();

        // Exception: Allow 75 min if already in transit with pickup
        if (job.status === "in_transit" && job.pickedUpAt) {
          const pickupTime = job.pickedUpAt.toMillis();
          const elapsed = now.toMillis() - pickupTime;
          if (elapsed < 75 * 60 * 1000) {
            console.log(`Job ${jobDoc.id} still within 75 min grace period`);
            continue;
          }
        }

        console.log(`Auto-cancelling job ${jobDoc.id}`);

        // Cancel job
        await jobDoc.ref.update({
          "status": "cancelled",
          "foodDeliveryDetails.autoCancelled": true,
          "cancelledAt": now,
          "cancellationReason": "Exceeded 60-minute delivery window",
        });

        // Refund customer if payment exists
        if (job.stripePaymentIntentId) {
          try {
            const stripe = require("stripe")(functions.config().stripe.secret);
            await stripe.paymentIntents.cancel(job.stripePaymentIntentId);

            await jobDoc.ref.update({paymentStatus: "refunded"});
            console.log(`Refunded payment for job ${jobDoc.id}`);
          } catch (error) {
            console.error(`Failed to refund payment for job ${jobDoc.id}:`, error);
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Error in autoCancelExpiredFoodDeliveries:", error);
      throw error;
    }
  });
