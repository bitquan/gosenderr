import * as admin from "firebase-admin";

/**
 * Utility functions for admin operations
 */

/**
 * Verify if a user is an admin
 * Checks both Firestore role and custom claims
 */
export async function verifyAdmin(uid: string): Promise<boolean> {
  try {
    // Check Firestore role
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();

    if (userDoc.exists && userDoc.data()?.role === "admin") {
      return true;
    }

    // Check custom claims
    const userRecord = await admin.auth().getUser(uid);
    if (userRecord.customClaims?.admin === true) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error verifying admin:", error);
    return false;
  }
}

/**
 * Log an admin action to the audit trail
 */
export async function logAdminAction(params: {
  adminId: string;
  action: string;
  targetUserId?: string;
  targetEmail?: string;
  metadata?: any;
}): Promise<void> {
  try {
    await admin.firestore().collection("adminActionLog").add({
      adminId: params.adminId,
      action: params.action,
      targetUserId: params.targetUserId || null,
      targetEmail: params.targetEmail || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: params.metadata || {},
    });
  } catch (error) {
    console.error("Error logging admin action:", error);
    // Don't throw - logging failure shouldn't block the operation
  }
}

/**
 * Check if user has a specific custom claim
 */
export async function hasCustomClaim(
  uid: string,
  claimName: string,
): Promise<boolean> {
  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord.customClaims?.[claimName] === true;
  } catch (error) {
    console.error("Error checking custom claim:", error);
    return false;
  }
}

/**
 * Set multiple custom claims at once
 */
export async function setCustomClaims(
  uid: string,
  claims: Record<string, any>,
): Promise<void> {
  await admin.auth().setCustomUserClaims(uid, claims);
}

/**
 * Get user's current role from Firestore
 */
export async function getUserRole(
  uid: string,
): Promise<string | null> {
  try {
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
    return userDoc.exists ? userDoc.data()?.role || null : null;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
}

/**
 * Update user role and sync with custom claims
 */
export async function updateUserRole(
  uid: string,
  newRole: string,
  adminId?: string,
): Promise<void> {
  // Update Firestore
  await admin
    .firestore()
    .doc(`users/${uid}`)
    .update({
      role: newRole,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  // Update custom claims
  await admin.auth().setCustomUserClaims(uid, {
    role: newRole,
    admin: newRole === "admin",
  });

  // Log action if adminId provided
  if (adminId) {
    await logAdminAction({
      adminId,
      action: "update_user_role",
      targetUserId: uid,
      metadata: { newRole },
    });
  }
}

/**
 * Ban or unban a user
 */
export async function setBanStatus(
  uid: string,
  banned: boolean,
  adminId: string,
  reason?: string,
): Promise<void> {
  // Update Firebase Auth
  await admin.auth().updateUser(uid, {
    disabled: banned,
  });

  // Update Firestore
  await admin
    .firestore()
    .doc(`users/${uid}`)
    .update({
      banned: banned,
      bannedAt: banned ? admin.firestore.FieldValue.serverTimestamp() : null,
      bannedBy: banned ? adminId : null,
      banReason: banned && reason ? reason : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  // Log action
  await logAdminAction({
    adminId,
    action: banned ? "ban_user" : "unban_user",
    targetUserId: uid,
    metadata: { reason },
  });
}
