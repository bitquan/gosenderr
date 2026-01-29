import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { verifyAdmin, logAdminAction } from "../utils/adminUtils";

interface BanUserRequest {
  targetUserId: string;
  banned: boolean;
  reason?: string;
}

/**
 * HTTP Callable Function: banUser
 * 
 * Bans or unbans a user account.
 * Disables Firebase Auth and marks user document as banned.
 * Only admins can call this function.
 * 
 * @param targetUserId - UID of user to ban/unban
 * @param banned - true to ban, false to unban
 * @param reason - Optional reason for ban
 */
export const banUser = functions.https.onCall(
  async (data: BanUserRequest, context) => {
    // 1. Verify caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    const { targetUserId, banned, reason } = data || {};

    // 2. Validate input
    if (!targetUserId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "targetUserId is required",
      );
    }

    if (typeof banned !== "boolean") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "banned must be a boolean",
      );
    }

    // 3. Verify caller is an admin
    const isAdmin = await verifyAdmin(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin privileges required",
      );
    }

    // 4. Prevent self-ban
    if (targetUserId === context.auth.uid) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Cannot ban yourself",
      );
    }

    // 5. Verify target user exists
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

    try {
      // 6. Update Firebase Auth (disable/enable account)
      await admin.auth().updateUser(targetUserId, {
        disabled: banned,
      });

      // 7. Update Firestore user document
      await admin
        .firestore()
        .doc(`users/${targetUserId}`)
        .update({
          banned: banned,
          bannedAt: banned ? admin.firestore.FieldValue.serverTimestamp() : null,
          bannedBy: banned ? context.auth.uid : null,
          banReason: banned && reason ? reason : null,
          unbannedAt: !banned ? admin.firestore.FieldValue.serverTimestamp() : null,
          unbannedBy: !banned ? context.auth.uid : null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // 8. Log admin action
      await logAdminAction({
        adminId: context.auth.uid,
        action: banned ? "ban_user" : "unban_user",
        targetUserId,
        targetEmail: targetData?.email || null,
        metadata: {
          reason: reason || null,
          userRole: targetData?.role || null,
        },
      });

      functions.logger.info(
        `Admin ${context.auth.uid} ${banned ? "banned" : "unbanned"} user ${targetUserId}`,
      );

      return {
        success: true,
        message: banned
          ? `User ${targetUserId} has been banned`
          : `User ${targetUserId} has been unbanned`,
        targetUserId,
        banned,
      };
    } catch (error) {
      functions.logger.error("Error banning/unbanning user:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to update ban status",
      );
    }
  },
);
