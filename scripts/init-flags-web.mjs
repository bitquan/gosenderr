// Quick script to initialize feature flags via Firebase web SDK
// Run with: node --input-type=module scripts/init-flags-web.mjs

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "YOUR_FIREBASE_API_KEY_PLACEHOLDER",
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
    onboarding: false,
    routeAcceptance: false,
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
