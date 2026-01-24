import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface SetClaimRequest {
  runnerId: string;
  approved: boolean;
  rejectionReason?: string;
}

/**
 * HTTP Callable Function: setPackageRunnerClaim
 * 
 * Approves or rejects package runner applications.
 * Only admins can call this function.
 * 
 * On approval:
 * - Sets custom claim: packageRunner: true
 * - Updates packageRunnerProfile.status: 'approved'
 * - Logs admin action
 * 
 * On rejection:
 * - Removes custom claim
 * - Updates packageRunnerProfile.status: 'rejected'
 * - Records rejection reason
 * 
 * @param runnerId - UID of runner to approve/reject
 * @param approved - true to approve, false to reject
 * @param rejectionReason - Optional reason if rejected
 */
export const setPackageRunnerClaim = functions.https.onCall(
  async (data: SetClaimRequest, context) => {
    // 1. Verify caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    const { runnerId, approved, rejectionReason } = data || {};

    // 2. Validate input
    if (!runnerId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "runnerId is required",
      );
    }

    if (typeof approved !== "boolean") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "approved must be a boolean",
      );
    }

    // 3. Verify caller is an admin
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

    // 4. Verify runner user exists and has application
    const runnerDoc = await admin
      .firestore()
      .doc(`users/${runnerId}`)
      .get();

    if (!runnerDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `Runner ${runnerId} not found`,
      );
    }

    const runnerData = runnerDoc.data();
    const runnerProfile = runnerData?.packageRunnerProfile;

    if (!runnerProfile) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "User has no package runner profile",
      );
    }

    if (runnerProfile.status !== "pending_review") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Runner status is ${runnerProfile.status}, expected pending_review`,
      );
    }

    try {
      // 5. Set custom claim in Firebase Auth
      await admin.auth().setCustomUserClaims(runnerId, {
        packageRunner: approved === true,
      });

      // 6. Update Firestore user document
      const updateData: any = {
        "packageRunnerProfile.status": approved ? "approved" : "rejected",
        "packageRunnerProfile.approvedAt": approved
          ? admin.firestore.Timestamp.now()
          : null,
        "packageRunnerProfile.rejectedAt": !approved
          ? admin.firestore.Timestamp.now()
          : null,
        "packageRunnerProfile.approvedBy": approved ? context.auth.uid : null,
        "packageRunnerProfile.rejectedBy": !approved ? context.auth.uid : null,
        updatedAt: admin.firestore.Timestamp.now(),
      };

      if (!approved && rejectionReason) {
        updateData["packageRunnerProfile.rejectionReason"] = rejectionReason;
      }

      await admin.firestore().doc(`users/${runnerId}`).update(updateData);

      // 7. Log admin action
      await admin.firestore().collection("adminActionLog").add({
        adminId: context.auth.uid,
        action: approved
          ? "approve_package_runner"
          : "reject_package_runner",
        targetUserId: runnerId,
        targetEmail: runnerData?.email || null,
        timestamp: admin.firestore.Timestamp.now(),
        metadata: {
          approved,
          rejectionReason: rejectionReason || null,
          vehicleType: runnerProfile.vehicleType || null,
          homeHub: runnerProfile.homeHub || null,
        },
      });

      functions.logger.info(
        `Admin ${context.auth.uid} ${approved ? "approved" : "rejected"} package runner ${runnerId}`,
      );

      return {
        success: true,
        message: approved
          ? `Package runner ${runnerId} approved`
          : `Package runner ${runnerId} rejected`,
        runnerId,
        approved,
      };
    } catch (error) {
      functions.logger.error("Error setting package runner claim:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to set package runner claim",
      );
    }
  },
);
