#!/usr/bin/env node

/**
 * Enable Phase 2 Features
 *
 * This script enables the package shipping and courier routes features
 * by updating the Firestore featureFlags document.
 */

const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin
const serviceAccountPath = path.join(
  __dirname,
  "../../firebase/gosenderr-6773f-firebase-adminsdk-serviceAccount.json",
);

try {
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "gosenderr-6773f",
  });

  console.log("✅ Firebase Admin initialized\n");
} catch (error) {
  console.error("❌ Error initializing Firebase Admin:", error.message);
  console.log("\n💡 Make sure service account key exists at:");
  console.log(
    "   firebase/gosenderr-6773f-firebase-adminsdk-serviceAccount.json\n",
  );
  process.exit(1);
}

const db = admin.firestore();

async function enablePhase2Features() {
  console.log("🚀 Enabling Phase 2 Features...\n");

  try {
    // Get current feature flags
    const flagsRef = db.collection("featureFlags").doc("production");
    const doc = await flagsRef.get();

    if (!doc.exists) {
      console.log("⚠️  Feature flags document does not exist. Creating...");
      await flagsRef.set({
        customer: {
          packageShipping: true,
        },
        delivery: {
          routes: true,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(
        "✅ Feature flags document created with Phase 2 features enabled\n",
      );
    } else {
      console.log("📋 Current feature flags:");
      const currentFlags = doc.data();
      console.log(JSON.stringify(currentFlags, null, 2));
      console.log("");

      // Update to enable Phase 2 features
      await flagsRef.update({
        "customer.packageShipping": true,
        "delivery.routes": true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("✅ Phase 2 features enabled!\n");
    }

    // Verify the update
    const updatedDoc = await flagsRef.get();
    const updatedFlags = updatedDoc.data();

    console.log("✅ Updated feature flags:");
    console.log(JSON.stringify(updatedFlags, null, 2));
    console.log("");

    // Check what's enabled
    console.log("📊 Feature Status:");
    console.log(
      "  📦 Package Shipping:",
      updatedFlags?.customer?.packageShipping ? "✅ ENABLED" : "❌ DISABLED",
    );
    console.log(
      "  🚚 Courier Routes:",
      updatedFlags?.delivery?.routes ? "✅ ENABLED" : "❌ DISABLED",
    );
    console.log("");

    console.log("🎉 Phase 2 features are now live!");
    console.log("");
    console.log("Next steps:");
    console.log("  1. Visit http://localhost:3000/ship (package shipping)");
    console.log(
      "  2. Visit http://localhost:3000/courier/routes (courier routes)",
    );
    console.log("  3. Test the end-to-end flows");
    console.log("");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error enabling features:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
enablePhase2Features();
