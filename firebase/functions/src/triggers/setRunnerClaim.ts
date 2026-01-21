import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Cloud Function to set packageRunner custom claim on user
 * Triggered when a runner application is approved
 */
export const setPackageRunnerClaim = functions.firestore
  .document("runnerApplications/{applicationId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const applicationId = context.params.applicationId;

    // Only process if status changed to 'approved'
    if (before.status !== "approved" && after.status === "approved") {
      const userId = after.userId;

      try {
        // Set custom claim
        await admin.auth().setCustomUserClaims(userId, {
          packageRunner: true,
        });

        // Update user document with package runner profile
        await admin.firestore().doc(`users/${userId}`).update({
          packageRunnerProfile: {
            isPackageRunner: true,
            applicationId: applicationId,
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            activeRoutes: [],
            completedRoutes: 0,
            totalMiles: 0,
            averageRating: 0,
            featureFlags: {
              enabled: true,
              hubNetwork: true,
              packageTracking: true,
              routeOptimization: true,
            },
          },
        });

        console.log(
          `Successfully set packageRunner claim for user ${userId} (application ${applicationId})`
        );
      } catch (error) {
        console.error(
          `Failed to set packageRunner claim for user ${userId}:`,
          error
        );
        // Don't throw - we don't want to fail the whole transaction
      }
    }
  });

/**
 * HTTP function to manually set packageRunner claim (for admin use)
 */
export const manuallySetRunnerClaim = functions.https.onCall(
  async (data, context) => {
    // Verify admin
    if (!context.auth || !context.auth.token.admin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can set runner claims"
      );
    }

    const { userId, applicationId } = data;

    if (!userId || !applicationId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "userId and applicationId are required"
      );
    }

    try {
      // Set custom claim
      await admin.auth().setCustomUserClaims(userId, {
        packageRunner: true,
      });

      // Update user document
      await admin.firestore().doc(`users/${userId}`).update({
        packageRunnerProfile: {
          isPackageRunner: true,
          applicationId: applicationId,
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          activeRoutes: [],
          completedRoutes: 0,
          totalMiles: 0,
          averageRating: 0,
          featureFlags: {
            enabled: true,
            hubNetwork: true,
            packageTracking: true,
            routeOptimization: true,
          },
        },
      });

      return {
        success: true,
        message: `Package runner claim set for user ${userId}`,
      };
    } catch (error) {
      console.error("Failed to set runner claim:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to set runner claim"
      );
    }
  }
);
