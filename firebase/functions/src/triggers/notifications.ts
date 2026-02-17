import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

type JobNotificationPayload = {
  customerUid?: string;
  createdByUid?: string;
  userId?: string;
  courierUid?: string;
  assignedCourierUid?: string;
  pickup?: { address?: string; label?: string };
  payment?: { courierPayout?: number };
  cancelReason?: string;
  [key: string]: unknown;
};

function resolveCustomerUid(job: JobNotificationPayload): string | null {
  const uid =
    (typeof job.customerUid === "string" && job.customerUid.trim()) ||
    (typeof job.createdByUid === "string" && job.createdByUid.trim()) ||
    (typeof job.userId === "string" && job.userId.trim()) ||
    "";
  return uid || null;
}

function resolveCourierUid(job: JobNotificationPayload): string | null {
  const uid =
    (typeof job.courierUid === "string" && job.courierUid.trim()) ||
    (typeof job.assignedCourierUid === "string" && job.assignedCourierUid.trim()) ||
    "";
  return uid || null;
}

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

async function notifyCustomerJobAssigned(jobId: string, job: JobNotificationPayload) {
  await sendNotification(resolveCustomerUid(job), {
    title: "Courier Assigned! 🎉",
    body: "A courier has been assigned to your delivery.",
    data: {type: "job_assigned", jobId},
  }, "deliveryUpdates");
}

async function notifyCourierJobAssigned(jobId: string, job: JobNotificationPayload) {
  const pickupLabel =
    (typeof job.pickup?.address === "string" && job.pickup.address.trim()) ||
    (typeof job.pickup?.label === "string" && job.pickup.label.trim()) ||
    "pickup location";
  await sendNotification(resolveCourierUid(job), {
    title: "New Job Assigned",
    body: `Pickup at ${pickupLabel}`,
    data: {type: "job_assigned", jobId},
  }, "deliveryUpdates");
}

async function notifyCustomerCourierEnRoute(jobId: string, job: JobNotificationPayload) {
  await sendNotification(resolveCustomerUid(job), {
    title: "Courier On The Way 🚗",
    body: "Your courier is heading to the pickup location.",
    data: {type: "courier_enroute", jobId},
  }, "deliveryUpdates");
}

async function notifyCustomerPackagePickedUp(jobId: string, job: JobNotificationPayload) {
  await sendNotification(resolveCustomerUid(job), {
    title: "Package Picked Up 📦",
    body: "Your courier has picked up the package.",
    data: {type: "package_picked_up", jobId},
  }, "deliveryUpdates");
}

async function notifyCustomerOutForDelivery(jobId: string, job: JobNotificationPayload) {
  await sendNotification(resolveCustomerUid(job), {
    title: "Out For Delivery 🚚",
    body: "Your package is on the way to the destination!",
    data: {type: "out_for_delivery", jobId},
  }, "deliveryUpdates");
}

async function notifyCustomerDeliveryComplete(jobId: string, job: JobNotificationPayload) {
  await sendNotification(resolveCustomerUid(job), {
    title: "Delivered! ✅",
    body: "Your package has been delivered successfully.",
    data: {type: "delivery_complete", jobId},
  }, "deliveryUpdates");
}

async function notifyCourierJobComplete(jobId: string, job: JobNotificationPayload) {
  const courierPayout = typeof job.payment?.courierPayout === "number" ? job.payment.courierPayout : 0;
  await sendNotification(resolveCourierUid(job), {
    title: "Job Complete! 💰",
    body: `You earned $${courierPayout.toFixed(2)}`,
    data: {type: "job_complete", jobId},
  }, "deliveryUpdates");
}

async function notifyPartiesJobCancelled(jobId: string, job: JobNotificationPayload) {
  const customerUid = resolveCustomerUid(job);
  const courierUid = resolveCourierUid(job);

  // Notify customer
  await sendNotification(customerUid, {
    title: "Delivery Cancelled",
    body: job.cancelReason || "The delivery has been cancelled.",
    data: {type: "job_cancelled", jobId},
  }, "deliveryUpdates");

  // Notify courier if assigned
  if (courierUid) {
    await sendNotification(courierUid, {
      title: "Job Cancelled",
      body: "The delivery job has been cancelled.",
      data: {type: "job_cancelled", jobId},
    }, "deliveryUpdates");
  }
}

async function sendNotification(uid: string | null | undefined, message: {
  title: string;
  body: string;
  data: Record<string, string>;
}, preferenceKey: "deliveryUpdates" | "nearbyCourierAlerts" | "marketing") {
  try {
    if (!uid || !uid.trim()) {
      console.log(`Skipping notification: missing uid (${message.data.type})`);
      return;
    }

    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data() || {};
    const prefs = userData.notificationPreferences || {};
    const shouldSend = prefs[preferenceKey] !== false;
    if (!shouldSend) {
      console.log(`Notifications disabled for ${uid} (${preferenceKey})`);
      return;
    }

    const fcmToken = userData.fcmToken;

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
