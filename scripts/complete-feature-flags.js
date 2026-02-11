const admin = require("firebase-admin");
admin.initializeApp({ projectId: "gosenderr-6773f" });
const db = admin.firestore();

const completeFlags = {
  marketplace: {
    enabled: true,
    itemListings: true,
    combinedPayments: true,
    courierOffers: false,
    messaging: true,
    ratings: true,
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
    webPortalEnabled: true,
    systemLogs: false,
    firebaseExplorer: false,
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
  senderrplace: {
    marketplace_v2: true,
    seller_portal_v2: true,
    listing_create_v1: true,
    checkout_v2: true,
    messaging_v1: true,
  },
};

(async () => {
  await db.collection("featureFlags").doc("config").set(completeFlags);
  console.log("✅ Complete feature flags structure created");
  process.exit(0);
})();
