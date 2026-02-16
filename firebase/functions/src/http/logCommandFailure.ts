import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface LogCommandFailureRequest {
  command?: "accept" | "status";
  jobId?: string;
  message?: string;
  code?: string;
  isOffline?: boolean;
}

export const logCommandFailure = functions.https.onCall(
  async (data: LogCommandFailureRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    const command = data?.command;
    const jobId = data?.jobId?.trim();
    const message = data?.message?.trim();

    if (!command || !jobId || !message) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "command, jobId, and message are required",
      );
    }

    await admin.firestore().collection("commandFailureTelemetry").add({
      uid: context.auth.uid,
      command,
      jobId,
      message,
      code: data?.code || null,
      isOffline: Boolean(data?.isOffline),
      userAgent: context.rawRequest?.headers?.["user-agent"] || null,
      path: context.rawRequest?.headers?.referer || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { ok: true };
  },
);
