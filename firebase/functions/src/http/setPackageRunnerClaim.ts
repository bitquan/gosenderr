import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface SetClaimRequest {
  runnerId: string;
  approved: boolean;
}

export const setPackageRunnerClaim = functions.https.onCall(
  async (data: SetClaimRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    const { runnerId, approved } = data || {};

    if (!runnerId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "runnerId is required",
      );
    }

    const adminUser = await admin
      .firestore()
      .doc(`users/${context.auth.uid}`)
      .get();
    if (!adminUser.exists || adminUser.data()?.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin privileges required",
      );
    }

    await admin.auth().setCustomUserClaims(runnerId, {
      packageRunner: approved === true,
    });

    return { success: true };
  },
);
