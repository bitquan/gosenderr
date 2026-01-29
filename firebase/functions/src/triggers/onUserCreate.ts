import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const auth = admin.auth();

/**
 * When a user document is created in Firestore, set their custom claims
 * This allows the security rules to properly validate role-based access
 */
export const onUserCreate = functions.firestore
  .document("users/{uid}")
  .onCreate(async (snapshot, context) => {
    const uid = context.params.uid;
    const userData = snapshot.data();

    console.log(`🔐 Setting custom claims for user: ${uid}`);

    try {
      // Get the role from the newly created document
      const role = userData?.role || "customer";

      // Set custom claims so security rules can check them
      await auth.setCustomUserClaims(uid, {
        role: role,
        admin: role === "admin",
      });

      console.log(`✅ Custom claims set for ${uid}: role=${role}`);
    } catch (error) {
      console.error(`❌ Error setting custom claims for ${uid}:`, error);
      throw error;
    }
  });
