import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { verifyAdmin } from "../utils/adminUtils";

interface SendTestPushRequest {
  token?: string;
  userId?: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
  apnsTopic?: string;
}

export const sendTestPush = functions.https.onCall(
  async (data: SendTestPushRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    const isAdmin = await verifyAdmin(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin privileges required",
      );
    }

    const { token, userId } = data || {};
    if (!token && !userId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "token or userId is required",
      );
    }

    let fcmToken = token;
    if (!fcmToken && userId) {
      const userDoc = await admin.firestore().doc(`users/${userId}`).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }
      fcmToken =
        userDoc.data()?.courierProfile?.fcmToken || userDoc.data()?.fcmToken;
    }

    if (!fcmToken) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "No FCM token available for target user",
      );
    }

    const title = data?.title?.trim() || "GoSenderr Test";
    const body = data?.body?.trim() || "Admin test push";
    const apnsTopic = data?.apnsTopic?.trim();

    try {
      const baseMessage: admin.messaging.Message = {
        token: fcmToken,
        notification: { title, body },
        data: data?.data || {},
      };

      const messageWithApns: admin.messaging.Message = apnsTopic
        ? {
            ...baseMessage,
            apns: {
              headers: {
                "apns-push-type": "alert",
                "apns-topic": apnsTopic,
                "apns-priority": "10",
              },
              payload: {
                aps: {
                  sound: "default",
                  badge: 1,
                },
              },
            },
          }
        : baseMessage;

      let response: string | null = null;
      let fallbackUsed = false;

      try {
        response = await admin.messaging().send(messageWithApns);
      } catch (primaryError) {
        if (!apnsTopic) {
          throw primaryError;
        }

        // If APNs headers fail, retry without APNs config.
        response = await admin.messaging().send(baseMessage);
        fallbackUsed = true;
      }

      await admin.firestore().collection("adminActionLog").add({
        adminId: context.auth.uid,
        action: "send_test_push",
        targetUserId: userId || null,
        targetToken: fcmToken,
        title,
        body,
        apnsTopic: apnsTopic || null,
        fallbackUsed,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, messageId: response, fallbackUsed };
    } catch (error) {
      const err = error as any;
      functions.logger.error("Failed to send test push", err);
      await admin.firestore().collection("adminActionLog").add({
        adminId: context.auth.uid,
        action: "send_test_push_failed",
        targetUserId: userId || null,
        targetToken: fcmToken,
        title,
        body,
        apnsTopic: apnsTopic || null,
        error: {
          message: err?.message || String(err),
          code: err?.code || null,
          details: err?.errorInfo || null,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send test push",
        {
          code: err?.code || null,
          details: err?.errorInfo || null,
          message: err?.message || String(err),
        },
      );
    }
  },
);
