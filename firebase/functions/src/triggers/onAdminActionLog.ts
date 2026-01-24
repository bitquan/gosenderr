import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Firestore Trigger: onAdminActionLog
 * 
 * Tracks all admin actions for audit compliance.
 * Increments admin's totalActions counter.
 * 
 * Triggered when: New document created in adminActionLog collection
 * 
 * Actions tracked:
 * - promote_to_admin / revoke_admin
 * - approve_package_runner / reject_package_runner
 * - ban_user / unban_user
 * - cancel_job
 * - reassign_courier
 * - resolve_dispute
 * - process_refund
 * - moderate_item
 * - toggle_feature_flag
 */
export const onAdminActionLog = functions.firestore
  .document("adminActionLog/{logId}")
  .onCreate(async (snap, context) => {
    const logData = snap.data();
    const adminId = logData.adminId;

    if (!adminId) {
      functions.logger.warn("Admin action log missing adminId:", snap.id);
      return;
    }

    try {
      // Increment admin's totalActions counter
      await admin
        .firestore()
        .doc(`users/${adminId}`)
        .update({
          "adminProfile.totalActions":
            admin.firestore.FieldValue.increment(1),
          "adminProfile.lastActionAt": admin.firestore.Timestamp.now(),
        });

      functions.logger.info(
        `Logged admin action: ${logData.action} by ${adminId}`,
      );
    } catch (error) {
      functions.logger.error("Error updating admin action count:", error);
      // Don't throw - logging should not block the original operation
    }
  });
