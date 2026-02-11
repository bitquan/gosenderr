/**
 * Script to initialize feature flags in Firestore
 * Run with: npx tsx scripts/init-feature-flags.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccountPath = resolve(
    __dirname,
    "../firebase/gosenderr-65e3a-firebase-adminsdk-juvhh-e8e16cd5a8.json",
  );

  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    initializeApp({
      projectId: "gosenderr-6773f",
    });
  }
}

const db = getFirestore();

async function initFeatureFlags() {
  const flagsRef = db.collection("featureFlags").doc("config");
  const forceAdminWeb = process.env.ENABLE_ADMIN_WEB === "1";

  const doc = await flagsRef.get();
  const data = (doc.data() || {}) as Record<string, any>;

  // Always upsert required keys so imported emulator data can't miss new flags.
  const nextFlags = {
    marketplace: {
      enabled: data?.marketplace?.enabled ?? true,
      itemListings: data?.marketplace?.itemListings ?? true,
      combinedPayments: data?.marketplace?.combinedPayments ?? true,
      courierOffers: data?.marketplace?.courierOffers ?? false,
      messaging: data?.marketplace?.messaging ?? true,
      ratings: data?.marketplace?.ratings ?? true,
    },
    delivery: {
      onDemand: data?.delivery?.onDemand ?? true,
      routes: data?.delivery?.routes ?? false,
      longRoutes: data?.delivery?.longRoutes ?? false,
      longHaul: data?.delivery?.longHaul ?? false,
    },
    courier: {
      rateCards: data?.courier?.rateCards ?? true,
      equipmentBadges: data?.courier?.equipmentBadges ?? true,
      workModes: data?.courier?.workModes ?? true,
    },
    seller: {
      stripeConnect: data?.seller?.stripeConnect ?? true,
      multiplePhotos: data?.seller?.multiplePhotos ?? true,
      foodListings: data?.seller?.foodListings ?? true,
    },
    customer: {
      liveTracking: data?.customer?.liveTracking ?? true,
      proofPhotos: data?.customer?.proofPhotos ?? true,
      routeDelivery: data?.customer?.routeDelivery ?? false,
      packageShipping: data?.customer?.packageShipping ?? false,
    },
    packageRunner: {
      enabled: data?.packageRunner?.enabled ?? false,
      hubNetwork: data?.packageRunner?.hubNetwork ?? false,
      packageTracking: data?.packageRunner?.packageTracking ?? false,
    },
    admin: {
      courierApproval: data?.admin?.courierApproval ?? true,
      equipmentReview: data?.admin?.equipmentReview ?? true,
      disputeManagement: data?.admin?.disputeManagement ?? true,
      analytics: data?.admin?.analytics ?? true,
      featureFlagsControl: data?.admin?.featureFlagsControl ?? true,
      webPortalEnabled: forceAdminWeb
        ? true
        : data?.admin?.webPortalEnabled ?? true,
      systemLogs: data?.admin?.systemLogs ?? false,
      firebaseExplorer: data?.admin?.firebaseExplorer ?? false,
    },
    advanced: {
      pushNotifications: data?.advanced?.pushNotifications ?? true,
      ratingEnforcement: data?.advanced?.ratingEnforcement ?? true,
      autoCancel: data?.advanced?.autoCancel ?? true,
      refunds: data?.advanced?.refunds ?? true,
    },
    ui: {
      modernStyling: data?.ui?.modernStyling ?? true,
      darkMode: data?.ui?.darkMode ?? true,
      animations: data?.ui?.animations ?? true,
    },
    senderrplace: {
      marketplace_v2: data?.senderrplace?.marketplace_v2 ?? true,
      seller_portal_v2: data?.senderrplace?.seller_portal_v2 ?? true,
      listing_create_v1: data?.senderrplace?.listing_create_v1 ?? true,
      checkout_v2: data?.senderrplace?.checkout_v2 ?? true,
      messaging_v1: data?.senderrplace?.messaging_v1 ?? true,
    },
    senderrplaceV2: {
      enabled: false,
      ads: false,
      badges: false,
      bookingLinks: false,
      adminControls: false,
    },
  };

  await flagsRef.set(nextFlags, { merge: true });
  console.log(
    doc.exists
      ? "✅ Feature flags document backfilled with required keys"
      : "✅ Feature flags document created with defaults",
  );
  console.log(
    `  admin.webPortalEnabled: ${nextFlags.admin.webPortalEnabled}`,
  );
  console.log(`  senderrplace.marketplace_v2: ${nextFlags.senderrplace.marketplace_v2}`);
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
