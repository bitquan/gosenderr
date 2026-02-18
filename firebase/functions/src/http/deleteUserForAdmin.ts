import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { verifyAdmin, logAdminAction } from "../utils/adminUtils";

interface DeleteUserForAdminRequest {
  targetUserId: string;
}

export const deleteUserForAdmin = functions.https.onCall(
  async (data: DeleteUserForAdminRequest, context) => {
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

    const { targetUserId } = data || {};
    if (!targetUserId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "targetUserId is required",
      );
    }

    if (targetUserId === context.auth.uid) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Cannot delete your own account",
      );
    }

    const userRef = admin.firestore().doc(`users/${targetUserId}`);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : null;

    try {
      await admin.auth().deleteUser(targetUserId);
    } catch (error: any) {
      if (error?.code !== "auth/user-not-found") {
        functions.logger.error("deleteUserForAdmin auth delete failed", error);
        throw new functions.https.HttpsError(
          "internal",
          "Failed to delete auth account",
        );
      }
    }

    if (userSnap.exists) {
      await userRef.delete();
    }

    await logAdminAction({
      adminId: context.auth.uid,
      action: "delete_user",
      targetUserId,
      targetEmail: userData?.email || null,
      metadata: {
        role: userData?.role || null,
      },
    });

    functions.logger.info(
      `Admin ${context.auth.uid} deleted user ${targetUserId}`,
    );

    return {
      success: true,
      targetUserId,
      deletedFirestoreDoc: userSnap.exists,
    };
  },
);
