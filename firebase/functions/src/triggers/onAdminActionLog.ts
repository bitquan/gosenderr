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
      // Safe helpers for FieldValue operations (emulator compatibility)
      const fv = (admin.firestore as any).FieldValue
      const ts = (admin.firestore as any).Timestamp

      if (fv && typeof fv.increment === 'function' && typeof fv.serverTimestamp === 'function') {
        // Use atomic update when available
        await admin.firestore().doc(`users/${adminId}`).update({
          'adminProfile.totalActions': fv.increment(1),
          'adminProfile.lastActionAt': fv.serverTimestamp(),
        })
      } else {
        // Fallback: use transaction to read-modify-write the counter and set timestamp
        await admin.firestore().runTransaction(async (tx) => {
          const ref = admin.firestore().doc(`users/${adminId}`)
          const snap = await tx.get(ref)
          const current = (snap.exists && snap.get('adminProfile.totalActions')) || 0
          const newTotal = current + 1
          const lastActionAt = (ts && typeof ts.fromDate === 'function') ? ts.fromDate(new Date()) : new Date()
          tx.update(ref, {
            'adminProfile.totalActions': newTotal,
            'adminProfile.lastActionAt': lastActionAt,
          })
        })
      }

      functions.logger.info(`Logged admin action: ${logData.action} by ${adminId}`)
    } catch (error) {
      functions.logger.error('Error updating admin action count:', error)
      // Don't throw - logging should not block the original operation
    }
  });
