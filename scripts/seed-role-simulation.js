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
];

async function upsertAuthUser(email, displayName) {
  try {
    const user = await auth.getUserByEmail(email);
    return user;
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }
    return auth.createUser({
      email,
      password: DEMO_PASSWORD,
      displayName,
    });
  }
}

async function upsertUserDoc(uid, user) {
  const baseDoc = {
    role: user.role,
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
      userRecords[user.role] = {
        uid: authUser.uid,
        email: user.email,
      };
      console.log(`✅ ${user.role} ready: ${user.email}`);
    }

    const itemId = await createDemoItem(userRecords.seller.uid);
    const orderId = await createDemoOrder({
      itemId,
      sellerUid: userRecords.seller.uid,
      buyerUid: userRecords.customer.uid,
      buyerEmail: userRecords.customer.email,
    });
    const jobId = await createDemoJob(userRecords.customer.uid);

    console.log("\n🎯 Demo artifacts created:");
    console.log(JSON.stringify({ itemId, orderId, jobId }, null, 2));
    console.log("\n🔐 Demo password:", DEMO_PASSWORD);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

run();
