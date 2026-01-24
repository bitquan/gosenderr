import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface SetAdminClaimRequest {
  targetUserId: string;
  isAdmin: boolean;
}

/**
 * HTTP Callable Function: setAdminClaim
 * 
 * Promotes a user to admin or revokes admin privileges.
 * Only existing admins can call this function.
 * 
 * Sets both:
 * - Custom claim: admin: true
 * - Firestore role: 'admin'
 * 
 * @param targetUserId - UID of user to promote/demote
 * @param isAdmin - true to grant admin, false to revoke
 */
export const setAdminClaim = functions.https.onCall(
  async (data: SetAdminClaimRequest, context) => {
    // 1. Verify caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    const { targetUserId, isAdmin } = data || {};

    // 2. Validate input
    if (!targetUserId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "targetUserId is required",
      );
    }

    if (typeof isAdmin !== "boolean") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "isAdmin must be a boolean",
      );
    }

    // 3. Verify caller is an admin
    const callerDoc = await admin
      .firestore()
      .doc(`users/${context.auth.uid}`)
      .get();

    if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin privileges required",
      );
    }

    // 4. Verify target user exists
    const targetDoc = await admin
      .firestore()
      .doc(`users/${targetUserId}`)
      .get();

    if (!targetDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `User ${targetUserId} not found`,
      );
    }

    const targetData = targetDoc.data();
    const oldRole = targetData?.role || "customer";

    try {
      // 5. Set custom claim in Firebase Auth
      await admin.auth().setCustomUserClaims(targetUserId, {
        admin: isAdmin,
        role: isAdmin ? "admin" : oldRole,
      });

      // 6. Update Firestore user document
      const updateData: any = {
        role: isAdmin ? "admin" : oldRole,
        updatedAt: admin.firestore.Timestamp.now(),
      };

      if (isAdmin) {
        // Add adminProfile if promoting
        updateData.adminProfile = {
          permissions: ["all"], // Full permissions by default
          isSuperAdmin: false,
          promotedAt: admin.firestore.Timestamp.now(),
          promotedBy: context.auth.uid,
          lastLoginAt: null,
          totalActions: 0,
        };
      } else {
        // Remove adminProfile if demoting
        updateData.adminProfile = admin.firestore.FieldValue.delete();
      }

      await admin.firestore().doc(`users/${targetUserId}`).update(updateData);

      // 7. Log admin action
      await admin.firestore().collection("adminActionLog").add({
        adminId: context.auth.uid,
        action: isAdmin ? "promote_to_admin" : "revoke_admin",
        targetUserId,
        targetEmail: targetData?.email || null,
        oldRole,
        newRole: isAdmin ? "admin" : oldRole,
        timestamp: admin.firestore.Timestamp.now(),
        metadata: {
          isAdminGranted: isAdmin,
        },
      });

      functions.logger.info(
        `Admin ${context.auth.uid} ${isAdmin ? "promoted" : "demoted"} user ${targetUserId}`,
      );

      return {
        success: true,
        message: isAdmin
          ? `User ${targetUserId} promoted to admin`
          : `User ${targetUserId} admin privileges revoked`,
        targetUserId,
        newRole: isAdmin ? "admin" : oldRole,
      };
    } catch (error) {
      functions.logger.error("Error setting admin claim:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to set admin claim",
      );
    }
  },
);
