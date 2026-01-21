import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Send notifications when job status changes
 */
export const sendNotifications = functions.firestore
  .document("jobs/{jobId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const jobId = context.params.jobId;

    // Check if status changed
    if (before.status === after.status) {
      return null;
    }

    console.log(`Job ${jobId} status changed: ${before.status} -> ${after.status}`);

    try {
      // Send notification based on new status
      switch (after.status) {
      case "assigned":
        await notifyCustomerJobAssigned(jobId, after);
        await notifyCourierJobAssigned(jobId, after);
        break;

      case "enroute_pickup":
        await notifyCustomerCourierEnRoute(jobId, after);
        break;

      case "picked_up":
        await notifyCustomerPackagePickedUp(jobId, after);
        break;

      case "enroute_dropoff":
        await notifyCustomerOutForDelivery(jobId, after);
        break;

      case "completed":
        await notifyCustomerDeliveryComplete(jobId, after);
        await notifyCourierJobComplete(jobId, after);
        break;

      case "cancelled":
        if (after.cancelledBy !== "system") {
          await notifyPartiesJobCancelled(jobId, after);
        }
        break;

      default:
        console.log(`No notification handler for status: ${after.status}`);
      }

      return {success: true};
    } catch (error) {
      console.error("Error sending notifications:", error);
      return {success: false, error};
    }
  });

async function notifyCustomerJobAssigned(jobId: string, job: any) {
  await sendNotification(job.customerUid, {
    title: "Courier Assigned! 🎉",
    body: "A courier has been assigned to your delivery.",
    data: {type: "job_assigned", jobId},
  });
}

async function notifyCourierJobAssigned(jobId: string, job: any) {
  await sendNotification(job.courierUid, {
    title: "New Job Assigned",
    body: `Pickup at ${job.pickup.address}`,
    data: {type: "job_assigned", jobId},
  });
}

async function notifyCustomerCourierEnRoute(jobId: string, job: any) {
  await sendNotification(job.customerUid, {
    title: "Courier On The Way 🚗",
    body: "Your courier is heading to the pickup location.",
    data: {type: "courier_enroute", jobId},
  });
}

async function notifyCustomerPackagePickedUp(jobId: string, job: any) {
  await sendNotification(job.customerUid, {
    title: "Package Picked Up 📦",
    body: "Your courier has picked up the package.",
    data: {type: "package_picked_up", jobId},
  });
}

async function notifyCustomerOutForDelivery(jobId: string, job: any) {
  await sendNotification(job.customerUid, {
    title: "Out For Delivery 🚚",
    body: "Your package is on the way to the destination!",
    data: {type: "out_for_delivery", jobId},
  });
}

async function notifyCustomerDeliveryComplete(jobId: string, job: any) {
  await sendNotification(job.customerUid, {
    title: "Delivered! ✅",
    body: "Your package has been delivered successfully.",
    data: {type: "delivery_complete", jobId},
  });
}

async function notifyCourierJobComplete(jobId: string, job: any) {
  await sendNotification(job.courierUid, {
    title: "Job Complete! 💰",
    body: `You earned $${job.payment?.courierPayout?.toFixed(2) || "0.00"}`,
    data: {type: "job_complete", jobId},
  });
}

async function notifyPartiesJobCancelled(jobId: string, job: any) {
  // Notify customer
  await sendNotification(job.customerUid, {
    title: "Delivery Cancelled",
    body: job.cancelReason || "The delivery has been cancelled.",
    data: {type: "job_cancelled", jobId},
  });

  // Notify courier if assigned
  if (job.courierUid) {
    await sendNotification(job.courierUid, {
      title: "Job Cancelled",
      body: "The delivery job has been cancelled.",
      data: {type: "job_cancelled", jobId},
    });
  }
}

async function sendNotification(uid: string, message: {
  title: string;
  body: string;
  data: Record<string, string>;
}) {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      console.log(`No FCM token for user ${uid}`);
      return;
    }

    await admin.messaging().send({
      notification: {
        title: message.title,
        body: message.body,
      },
      data: message.data,
      token: fcmToken,
    });

    console.log(`Sent notification to ${uid}: ${message.title}`);
  } catch (error) {
    console.error(`Failed to send notification to ${uid}:`, error);
  }
}
