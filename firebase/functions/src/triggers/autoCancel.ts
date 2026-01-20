import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Auto-cancel jobs that have been open for too long without being claimed
 * Runs every 5 minutes
 */
export const autoCancel = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const cutoffTime = new Date(now.toMillis() - 30 * 60 * 1000); // 30 minutes ago
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffTime);

    console.log(`Checking for jobs to auto-cancel (older than ${cutoffTime.toISOString()})`);

    try {
      // Find all open jobs created more than 30 minutes ago
      const snapshot = await db
        .collection("jobs")
        .where("status", "==", "open")
        .where("createdAt", "<", cutoffTimestamp)
        .get();

      if (snapshot.empty) {
        console.log("No jobs to auto-cancel");
        return null;
      }

      console.log(`Found ${snapshot.size} jobs to auto-cancel`);

      const batch = db.batch();
      const cancelledJobs: string[] = [];

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "cancelled",
          cancelledAt: now,
          cancelledBy: "system",
          cancelReason: "No courier claimed within 30 minutes",
          updatedAt: now,
        });
        cancelledJobs.push(doc.id);
      });

      await batch.commit();

      console.log(`Successfully auto-cancelled ${cancelledJobs.length} jobs:`, cancelledJobs);

      // Send notifications to customers about cancelled jobs
      for (const jobId of cancelledJobs) {
        const jobDoc = snapshot.docs.find((doc) => doc.id === jobId);
        if (jobDoc) {
          const job = jobDoc.data();
          await sendCancellationNotification(jobId, job.customerUid);
        }
      }

      return {
        success: true,
        cancelledCount: cancelledJobs.length,
        cancelledJobs,
      };
    } catch (error) {
      console.error("Error auto-cancelling jobs:", error);
      throw error;
    }
  });

/**
 * Send push notification to customer about job cancellation
 */
async function sendCancellationNotification(jobId: string, customerUid: string) {
  try {
    // Get customer's FCM token
    const userDoc = await db.collection("users").doc(customerUid).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      console.log(`No FCM token for customer ${customerUid}`);
      return;
    }

    // Send notification
    const message = {
      notification: {
        title: "Delivery Cancelled",
        body: "Your delivery was cancelled because no courier was available. Please try again.",
      },
      data: {
        type: "job_cancelled",
        jobId,
      },
      token: fcmToken,
    };

    await admin.messaging().send(message);
    console.log(`Sent cancellation notification to ${customerUid} for job ${jobId}`);
  } catch (error) {
    console.error(`Failed to send notification to ${customerUid}:`, error);
  }
}
