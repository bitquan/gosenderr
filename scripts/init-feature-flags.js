// Initialize feature flags in Firestore
// Run from project root: node scripts/init-feature-flags.js
const admin = require("./firebase-admin-wrapper");

async function initializeFeatureFlags() {
  try {
    const db = admin.firestore();
    const featureFlagsRef = db.collection("featureFlags").doc("config");

    const flags = {
      marketplace: {
        enabled: true, // Already in production
        itemListings: true,
        combinedPayments: true,
      },
      delivery: {
        onDemand: true, // Already in production
        routes: false, // NEW: Enable when ready to test local route batching
        longRoutes: false, // NEW: Regional routes
        longHaul: false, // NEW: Interstate logistics
      },
      courier: {
       featureFlagsControl: true,
       webPortalEnabled: false,
        equipmentBadges: true,
        workModes: true,
      },
      seller: {
        stripeConnect: true, // Already in production
        multiplePhotos: true,
        foodListings: true,
      },
      customer: {
        liveTracking: true, // Already in production
        proofPhotos: true,
        routeDelivery: false, // NEW: Customer can opt for route delivery discount
        packageShipping: false, // NEW: Package shipping feature
      },
      packageRunner: {
        enabled: false, // NEW: Enable to allow package runner onboarding
        onboarding: false, // NEW: Onboarding flow
        routeAcceptance: false, // NEW: Allow runners to accept routes
      },
      updatedAt: new Date().toISOString(),
    };

    await featureFlagsRef.set(flags);
    console.log("✅ Feature flags initialized successfully");
    console.log("All PR #11 features are disabled by default");
    console.log("\nTo enable features, update the document in Firestore:");
    console.log(
      "https://console.firebase.google.com/project/gosenderr-6773f/firestore/data/featureFlags/config",
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing feature flags:", error);
    process.exit(1);
  }
}

initializeFeatureFlags();
