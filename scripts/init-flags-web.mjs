// Quick script to initialize feature flags via Firebase web SDK
// Run with: node --input-type=module scripts/init-flags-web.mjs

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyCNj3HH0FqjgTVj7ysxINB6ZEtL3g6NvKo",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "gosenderr-6773f.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gosenderr-6773f",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "gosenderr-6773f.appspot.com",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1045849821321",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:1045849821321:web:d3ef3ec12b56e892c6f384",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const flags = {
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
    courierApproval: true,
    equipmentReview: true,
    disputeManagement: true,
    analytics: true,
    featureFlagsControl: true,
    webPortalEnabled: true,
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
  senderrplace: {
    marketplace_v2: true,
    seller_portal_v2: true,
    listing_create_v1: true,
    checkout_v2: true,
    messaging_v1: true,
  },
  senderrplaceV2: {
    enabled: false,
    ads: false,
    badges: false,
    bookingLinks: false,
    adminControls: false,
  },
};

try {
  await setDoc(doc(db, "featureFlags", "config"), flags);
  console.log("✅ Feature flags initialized successfully");
  console.log("All PR #11 features are disabled by default");
  console.log(
    "\nView/edit at: https://console.firebase.google.com/project/gosenderr-6773f/firestore/data/featureFlags/config",
  );
  process.exit(0);
} catch (error) {
  console.error("❌ Error:", error);
  process.exit(1);
}
