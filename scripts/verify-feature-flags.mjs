#!/usr/bin/env node

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = join(
  __dirname,
  "../firebase/gosenderr-6773f-firebase-adminsdk-4b3oz-77f6113e30.json",
);
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function verifyFeatureFlags() {
  try {
    console.log("Checking feature flags document...");

    const docRef = db.collection("featureFlags").doc("config");
    const doc = await docRef.get();

    if (doc.exists) {
      console.log("✅ Feature flags document exists!");
      console.log("Current flags:", JSON.stringify(doc.data(), null, 2));
    } else {
      console.log("❌ Feature flags document does NOT exist");
      console.log("Creating it now...");

      const flags = {
        marketplace: {
          enabled: true,
          itemListings: true,
          combinedPayments: true,
        },
        delivery: {
          onDemand: true,
          routes: false,
          longRoutes: false,
          longHaul: false,
        },
        courier: {
          rateCards: true,
          equipmentBadges: true,
          workModes: true,
        },
        seller: {
          stripeConnect: true,
          multiplePhotos: true,
          foodListings: true,
        },
        customer: {
          liveTracking: true,
          proofPhotos: true,
          routeDelivery: false,
          packageShipping: false,
        },
        packageRunner: {
          enabled: false,
          hubNetwork: false,
          packageTracking: false,
        },
        admin: {
          courierApproval: false,
          equipmentReview: false,
          disputeManagement: false,
          analytics: false,
          featureFlagsControl: true,
        },
        advanced: {
          pushNotifications: false,
          ratingEnforcement: true,
          autoCancel: true,
          refunds: true,
        },
        ui: {
          modernStyling: true,
          darkMode: false,
          animations: true,
        },
      };

      await docRef.set(flags);
      console.log("✅ Feature flags document created successfully!");
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

verifyFeatureFlags();
