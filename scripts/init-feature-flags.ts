/**
 * Script to initialize feature flags in Firestore
 * Run with: npx tsx scripts/init-feature-flags.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

// Initialize Firebase Admin
if (getApps().length === 0) {
  let initialized = false;
  try {
    // Prefer explicit service account when present (CI / developer-provided)
    const saPath = resolve(__dirname, "../firebase/gosenderr-65e3a-firebase-adminsdk-juvhh-e8e16cd5a8.json");
    try {
      const serviceAccount = JSON.parse(readFileSync(saPath, 'utf-8'));
      initializeApp({ credential: cert(serviceAccount) });
      initialized = true;
    } catch (err) {
      // Missing service account — fall back to emulator-only initialization below
    }
  } catch (err) {
    // no-op
  }

  if (!initialized) {
    // Running against local emulator or missing service account — initialize by projectId
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'demo-senderr' });
  }
}

const db = getFirestore();

async function initFeatureFlags() {
  const flagsRef = db.collection("featureFlags").doc("config");

  // Check if document exists
  const doc = await flagsRef.get();

  if (doc.exists) {
    console.log("✅ Feature flags document already exists");
    console.log("\nCurrent flags:");
    const data = doc.data();
    console.log(
      `  customer.packageShipping: ${data?.customer?.packageShipping ?? "undefined"}`,
    );
    console.log(`  delivery.routes: ${data?.delivery?.routes ?? "undefined"}`);
    return;
  }

  // Create default feature flags
  const defaultFlags = {
    marketplace: {
      enabled: true,
      itemListings: true,
      combinedPayments: true,
    },
    delivery: {
      onDemand: true,
      routes: false, // Phase 2: Enable this
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
      packageShipping: false, // Phase 2: Enable this
    },
    packageRunner: {
      enabled: false,
      hubNetwork: false,
      packageTracking: false,
    },
    admin: {
      courierApproval: true,
      equipmentReview: true,
      disputeManagement: true,
      analytics: true,
      featureFlagsControl: true,
      webPortalEnabled: false,
    },
    advanced: {
      pushNotifications: true,
      ratingEnforcement: true,
      autoCancel: true,
      refunds: true,
    },
    ui: {
      modernStyling: true,
      darkMode: true,
      animations: true,
    },
    senderrplaceV2: {
      enabled: false,
      ads: false,
      badges: false,
      bookingLinks: false,
      adminControls: false,
    },
  };

  await flagsRef.set(defaultFlags);
  console.log("✅ Feature flags document created with defaults");
  console.log("\n📝 Phase 2 flags ready to enable:");
  console.log("  customer.packageShipping: false → needs enabling");
  console.log("  delivery.routes: false → needs enabling");
}

initFeatureFlags()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
