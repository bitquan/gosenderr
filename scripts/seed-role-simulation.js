const admin = require("./firebase-admin-wrapper");

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;

if (PROJECT_ID && (!admin.apps || admin.apps.length === 0)) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();
const auth = admin.auth();
const { FieldValue } = admin.firestore;

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "DemoPass123!";

const demoUsers = [
  {
    email: "customer@example.com",
    role: "customer",
    displayName: "Demo Customer",
  },
  {
    email: "seller@example.com",
    role: "seller",
    displayName: "Demo Seller",
  },
  {
<<<<<<< HEAD
    email: "courier@example.com",
    role: "courier",
    displayName: "Demo Courier",
=======
    email: "admin@example.com",
    role: "admin",
    displayName: "Demo Admin",
>>>>>>> senderr_app
  },
];

const DEFAULT_FEATURE_FLAGS = {
  marketplace: {
    enabled: true,
    itemListings: true,
    combinedPayments: true,
    courierOffers: false,
  },
  delivery: {
    onDemand: true,
    routes: true,
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
    packageShipping: true,
  },
  packageRunner: {
    enabled: true,
    hubNetwork: true,
    packageTracking: true,
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
  senderrplaceV2: {
    enabled: false,
    ads: false,
    badges: false,
    bookingLinks: false,
    adminControls: false,
  },
};

async function upsertAuthUser(email, displayName) {
  try {
    const user = await auth.getUserByEmail(email);
    return user;
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }
  }

  try {
    return await auth.createUser({
      email,
      password: DEMO_PASSWORD,
      displayName,
    });
  } catch (error) {
    // Another seed process may have created the user between getUserByEmail and createUser.
    if (error.code === "auth/email-already-exists") {
      return auth.getUserByEmail(email);
    }
    throw error;
  }
}

async function upsertUserDoc(uid, user) {
  const baseDoc = {
    role: user.role,
    primaryRole: user.role,
    roles: [user.role],
    isAdmin: user.role === "admin",
    email: user.email,
    displayName: user.displayName,
    averageRating: 0,
    totalRatings: 0,
    totalDeliveries: 0,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (user.role === "courier") {
    baseDoc.courier = {
      isOnline: true,
      transportMode: "car",
      rateCard: {
        baseFee: 6,
        perMile: 1.25,
        perMinute: 0.25,
        pickupPerMile: 0.75,
        minimumFee: 8,
        maxPickupMiles: 20,
        maxJobMiles: 60,
        maxRadiusMiles: 25,
        updatedAt: FieldValue.serverTimestamp(),
      },
    };
    baseDoc.location = {
      lat: 37.7749,
      lng: -122.4194,
      updatedAt: FieldValue.serverTimestamp(),
    };
  }

  const userRef = db.collection("users").doc(uid);
  const existing = await userRef.get();

  if (!existing.exists) {
    await userRef.set({
      ...baseDoc,
      createdAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  await userRef.set(baseDoc, { merge: true });
}

async function ensureAdminAccess(uid, email, displayName) {
  await auth.setCustomUserClaims(uid, { admin: true, role: "admin" });

  const adminProfileRef = db.collection("adminProfiles").doc(uid);
  const existing = await adminProfileRef.get();
  const baseProfile = {
    uid,
    email,
    displayName,
    role: "admin",
    status: "active",
    permissions: ["all"],
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!existing.exists) {
    await adminProfileRef.set({
      ...baseProfile,
      createdAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  await adminProfileRef.set(baseProfile, { merge: true });
}

async function ensureFeatureFlagsConfig() {
  const configRef = db.collection("featureFlags").doc("config");
  const existing = await configRef.get();

  if (!existing.exists) {
    await configRef.set({
      ...DEFAULT_FEATURE_FLAGS,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  await configRef.set(
    {
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
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function createDemoItem(sellerUid) {
  const itemsRef = db.collection("items");
  const itemDoc = await itemsRef.add({
    sellerId: sellerUid,
    title: "Demo Item",
    description: "Demo listing for role simulation",
    category: "electronics",
    condition: "good",
    price: 15,
    pickupLocation: {
      address: "123 Market St, San Francisco, CA",
      lat: 37.7936,
      lng: -122.3965,
    },
    photos: [],
    itemDetails: {
      requiresHelp: false,
    },
    isFoodItem: false,
    status: "available",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return itemDoc.id;
}

async function createDemoOrder({ itemId, sellerUid, buyerUid, buyerEmail }) {
  const ordersRef = db.collection("marketplaceOrders");
  const orderDoc = await ordersRef.add({
    itemId,
    itemTitle: "Demo Item",
    sellerId: sellerUid,
    buyerId: buyerUid,
    buyerEmail,
    dropoffAddress: {
      address: "456 Mission St, San Francisco, CA",
      lat: 37.7897,
      lng: -122.4011,
    },
    deliveryFee: 9,
    platformFee: 2.5,
    itemPrice: 15,
    total: 26.5,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return orderDoc.id;
}

async function createDemoJob(customerUid) {
  const jobsRef = db.collection("jobs");
  const jobDoc = await jobsRef.add({
    createdByUid: customerUid,
    status: "open",
    pickup: {
      lat: 37.7936,
      lng: -122.3965,
      label: "Pickup - Demo Vendor",
    },
    dropoff: {
      lat: 37.7897,
      lng: -122.4011,
      label: "Dropoff - Demo Customer",
    },
    package: {
      size: "small",
      flags: {
        fragile: false,
      },
      notes: "Demo job created by seed script",
    },
    photos: [],
    courierUid: null,
    agreedFee: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return jobDoc.id;
}

async function run() {
  try {
    if (!PROJECT_ID) {
      console.warn(
        "⚠️  FIREBASE_PROJECT_ID not set. If you see auth/metadata errors, set it along with GOOGLE_APPLICATION_CREDENTIALS.",
      );
    }
    const userRecords = {};

    for (const user of demoUsers) {
      const authUser = await upsertAuthUser(user.email, user.displayName);
      await upsertUserDoc(authUser.uid, user);
      if (user.role === "admin") {
        await ensureAdminAccess(authUser.uid, user.email, user.displayName);
      }
      userRecords[user.role] = {
        uid: authUser.uid,
        email: user.email,
      };
      console.log(`✅ ${user.role} ready: ${user.email}`);
    }

<<<<<<< HEAD
    // Ensure tokenPolicy is available in emulator seeds (used by payments/wallet tests)
    await db.doc('platformSettings/tokenPolicy').set({
      enabled: true,
      finalSale: true,
      tokenValueUsd: 1,
      costs: {
        jobUnlockStandard: 1,
        jobUnlockPriority: 2,
        jobUnlockHeavy: 3,
        listingPublish: 2,
        cashFee: 1,
        adBoost24h: 5,
        adBoost7d: 25,
        adBoost30d: 80,
        adFeatured7d: 120
      },
      packs: [
        { id: 'starter_10', tokens: 10, priceUsd: 10 },
        { id: 'starter_100', tokens: 100, priceUsd: 90 }
      ]
    }, { merge: true });
=======
    await ensureFeatureFlagsConfig();
    console.log("✅ feature flags ready: featureFlags/config (admin.webPortalEnabled=true)");
>>>>>>> senderr_app

    const itemId = await createDemoItem(userRecords.seller.uid);
    const orderId = await createDemoOrder({
      itemId,
      sellerUid: userRecords.seller.uid,
      buyerUid: userRecords.customer.uid,
      buyerEmail: userRecords.customer.email,
    });
    const jobId = await createDemoJob(userRecords.customer.uid);

    // Seed demo courier external payout methods (Cash App + Zelle)
    if (userRecords.courier && userRecords.courier.uid) {
      await db.collection('paymentMethods').add({
        userId: userRecords.courier.uid,
        type: 'cash_app',
        label: 'Cash App — $demo_cash',
        identifier: '$demo_cash',
        qrUrl: '',
        enabled: true,
        createdAt: FieldValue.serverTimestamp(),
      });
      await db.collection('paymentMethods').add({
        userId: userRecords.courier.uid,
        type: 'zelle',
        label: 'Zelle — (555) 555-0100',
        identifier: '(555) 555-0100',
        qrUrl: '',
        enabled: true,
        createdAt: FieldValue.serverTimestamp(),
      });
      console.log('✅ Seeded demo courier external payout methods');
    }

    // Seed demo seller external payout methods (so marketplace buyers can view seller options)
    if (userRecords.seller && userRecords.seller.uid) {
      await db.collection('paymentMethods').add({
        userId: userRecords.seller.uid,
        type: 'cash_app',
        label: 'Cash App — $seller_demo',
        identifier: '$seller_demo',
        qrUrl: '',
        enabled: true,
        createdAt: FieldValue.serverTimestamp(),
      });
      await db.collection('paymentMethods').add({
        userId: userRecords.seller.uid,
        type: 'zelle',
        label: 'Zelle — (555) 555-0200',
        identifier: '(555) 555-0200',
        qrUrl: '',
        enabled: true,
        createdAt: FieldValue.serverTimestamp(),
      });
      console.log('✅ Seeded demo seller external payout methods');
    }

    console.log("\n🎯 Demo artifacts created:");
    console.log(JSON.stringify({ itemId, orderId, jobId }, null, 2));
    console.log("\n🔐 Demo password:", DEMO_PASSWORD);
    console.log("\n👤 Admin user:");
    console.log("   admin@example.com / " + DEMO_PASSWORD);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

run();
