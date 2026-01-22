#!/usr/bin/env node

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBvZ8ExF8tYc8gDWaB8Yn5rL2zQ0xKZ5nE",
  authDomain: "gosenderr-6773f.firebaseapp.com",
  projectId: "gosenderr-6773f",
  storageBucket: "gosenderr-6773f.appspot.com",
  messagingSenderId: "1068736474890",
  appId: "1:1068736474890:web:8f9e3f2f1f8f9e3f2f1f8f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

console.log("🚀 Starting PR #11 Feature Tests\n");

// Test 1: Feature Flags
async function testFeatureFlags() {
  console.log("📋 Test 1: Feature Flags");
  try {
    const flagsDoc = await getDoc(doc(db, "featureFlags", "config"));
    if (!flagsDoc.exists()) {
      console.log("  ❌ Feature flags document not found");
      return false;
    }

    const flags = flagsDoc.data();
    console.log("  ✅ Feature flags loaded");
    console.log(
      `     - Package Shipping: ${flags.customer?.packageShipping ? "ENABLED" : "DISABLED"}`,
    );
    console.log(
      `     - Routes: ${flags.delivery?.routes ? "ENABLED" : "DISABLED"}`,
    );
    console.log(
      `     - Long Routes: ${flags.delivery?.longRoutes ? "ENABLED" : "DISABLED"}`,
    );
    console.log(
      `     - Long Haul: ${flags.delivery?.longHaul ? "ENABLED" : "DISABLED"}`,
    );
    console.log(
      `     - Package Runner: ${flags.packageRunner?.enabled ? "ENABLED" : "DISABLED"}`,
    );
    return true;
  } catch (error) {
    console.log("  ❌ Error:", error.message);
    return false;
  }
}

// Test 2: Hubs
async function testHubs() {
  console.log("\n🏢 Test 2: Hub Network");
  try {
    const hubsSnapshot = await getDocs(collection(db, "hubs"));
    console.log(`  ✅ Found ${hubsSnapshot.size} hubs`);

    if (hubsSnapshot.size > 0) {
      const hubs = [];
      hubsSnapshot.forEach((doc) => {
        const hub = doc.data();
        hubs.push(`${hub.city}, ${hub.state}`);
      });
      console.log(
        `     Hubs: ${hubs.slice(0, 5).join(", ")}${hubs.length > 5 ? "..." : ""}`,
      );
    }
    return hubsSnapshot.size > 0;
  } catch (error) {
    console.log("  ❌ Error:", error.message);
    return false;
  }
}

// Test 3: Create test delivery job
async function testDeliveryJob(userEmail, userPassword) {
  console.log("\n📦 Test 3: Create Test Delivery Job");
  try {
    // Sign in
    const userCredential = await signInWithEmailAndPassword(
      auth,
      userEmail,
      userPassword,
    );
    const uid = userCredential.user.uid;
    console.log(`  ✅ Signed in as ${userEmail}`);

    // Create a test job
    const testJob = {
      createdByUid: uid,
      status: "open",
      pickup: {
        lat: 37.7749,
        lng: -122.4194,
        address: "123 Market St, San Francisco, CA 94102",
      },
      dropoff: {
        lat: 37.7849,
        lng: -122.4094,
        address: "456 Mission St, San Francisco, CA 94105",
      },
      package: {
        size: "medium",
        description: "Test package for PR #11",
      },
      pickupWindow: {
        start: Timestamp.now(),
        end: Timestamp.fromMillis(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      },
      suggestedFee: 15.0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const jobRef = await addDoc(collection(db, "deliveryJobs"), testJob);
    console.log(`  ✅ Created test job: ${jobRef.id}`);
    console.log(`     Pickup: SF Market St`);
    console.log(`     Dropoff: SF Mission St`);
    return jobRef.id;
  } catch (error) {
    console.log("  ❌ Error:", error.message);
    return null;
  }
}

// Test 4: Check routes
async function testRoutes() {
  console.log("\n🛣️  Test 4: Check Routes");
  try {
    const routesSnapshot = await getDocs(collection(db, "routes"));
    console.log(`  ℹ️  Found ${routesSnapshot.size} routes`);

    if (routesSnapshot.size === 0) {
      console.log("     Note: Routes are built hourly by Cloud Function");
      console.log("     Create multiple jobs and wait for next build cycle");
    } else {
      routesSnapshot.forEach((doc) => {
        const route = doc.data();
        console.log(
          `     Route ${doc.id}: ${route.stops?.length || 0} stops, ${route.status}`,
        );
      });
    }
    return true;
  } catch (error) {
    console.log("  ❌ Error:", error.message);
    return false;
  }
}

// Test 5: Check packages
async function testPackages() {
  console.log("\n📫 Test 5: Check Packages");
  try {
    const packagesSnapshot = await getDocs(collection(db, "packages"));
    console.log(`  ℹ️  Found ${packagesSnapshot.size} packages`);

    if (packagesSnapshot.size === 0) {
      console.log(
        "     Note: Packages created via /ship page when feature enabled",
      );
    } else {
      packagesSnapshot.forEach((doc) => {
        const pkg = doc.data();
        console.log(
          `     Package ${doc.id}: ${pkg.status}, ${pkg.serviceLevel}`,
        );
      });
    }
    return true;
  } catch (error) {
    console.log("  ❌ Error:", error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  const results = [];

  results.push(await testFeatureFlags());
  results.push(await testHubs());
  results.push(await testRoutes());
  results.push(await testPackages());

  // Optional: Create test job if credentials provided
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  if (testEmail && testPassword) {
    const jobId = await testDeliveryJob(testEmail, testPassword);
    results.push(jobId !== null);
  } else {
    console.log("\n⚠️  Skipping job creation test (no credentials)");
    console.log(
      "   Set TEST_USER_EMAIL and TEST_USER_PASSWORD to test job creation",
    );
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  const passed = results.filter((r) => r).length;
  const total = results.length;
  console.log(`\n✨ Test Results: ${passed}/${total} passed\n`);

  if (passed === total) {
    console.log("🎉 All tests passed! PR #11 features are ready.\n");
  } else {
    console.log("⚠️  Some tests failed. Check output above.\n");
  }
}

runTests().catch(console.error);
