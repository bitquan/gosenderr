/**
 * One-time script to sync emails from Firebase Auth to Firestore user documents
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Firebase Admin (using default credentials from environment)
const app = initializeApp();
const auth = getAuth(app);
const db = getFirestore(app);

async function syncUserEmails() {
  console.log("🔄 Starting email sync...");

  try {
    // Get all users from Firestore
    const usersSnapshot = await db.collection("users").get();
    console.log(`📊 Found ${usersSnapshot.size} users in Firestore`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      // Skip if email already exists
      if (userData.email) {
        console.log(`⏭️  User ${userId} already has email: ${userData.email}`);
        skipped++;
        continue;
      }

      try {
        // Get user from Firebase Auth
        const authUser = await auth.getUser(userId);

        if (authUser.email) {
          // Update Firestore document with email
          await db.collection("users").doc(userId).update({
            email: authUser.email,
            updatedAt: new Date(),
          });
          console.log(
            `✅ Updated user ${userId} with email: ${authUser.email}`,
          );
          updated++;
        } else {
          console.log(`⚠️  User ${userId} has no email in Firebase Auth`);
          skipped++;
        }
      } catch (err) {
        console.error(`❌ Error updating user ${userId}:`, err.message);
        errors++;
      }
    }

    console.log("\n📊 Summary:");
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log("\n🎉 Email sync complete!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

syncUserEmails();
