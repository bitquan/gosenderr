// Initialize feature flags in Firestore
// Run from project root: node scripts/init-feature-flags.js
const admin = require("./firebase-admin-wrapper");

async function initializeFeatureFlags() {
  try {
    const db = admin.firestore();
    const featureFlagsRef = db.collection("featureFlags").doc("config");

    const flags = {
      marketplace: {
        enabled: true,
        itemListings: true,
        combinedPayments: true,
        courierOffers: false,
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
        courierApproval: true,
        equipmentReview: true,
        disputeManagement: true,
        analytics: true,
        featureFlagsControl: true,
        webPortalEnabled: false,
        systemLogs: false,
        firebaseExplorer: false,
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
