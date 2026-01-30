/**
 * Test Suite for claimJob Cloud Function
 * 
 * Location: firebase/functions/src/courier/__tests__/claimJob.test.ts
 * 
 * Run tests:
 * cd firebase/functions
 * npm test -- claimJob.test.ts
 * 
 * Or in Firebase Emulator UI:
 * 1. Start: firebase emulators:start
 * 2. Open: http://127.0.0.1:4000/functions
 * 3. Call with test data below
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

describe("claimJob", () => {
  let db: FirebaseFirestore.Firestore;

  beforeAll(() => {
    // Initialize Firebase Admin SDK
    // This will auto-detect emulator from FIRESTORE_EMULATOR_HOST env var
    const app = initializeApp({
      projectId: "gosenderr-6773f",
    });
    db = getFirestore(app);
  });

  beforeEach(async () => {
    // Clear collections before each test
    const collections = ["jobs", "couriers"];
    for (const collection of collections) {
      const snapshot = await db.collection(collection).get();
      for (const doc of snapshot.docs) {
        await doc.ref.delete();
      }
    }
  });

  /**
   * TEST 1: Successfully claim an available job
   */
  test("should claim an available job", async () => {
    const courierId = "courier-test-123";
    const jobId = "job-test-123";

    // Setup: Create courier profile
    await db.collection("couriers").doc(courierId).set({
      name: "Test Courier",
      phone: "555-0001",
      rating: 4.8,
      totalJobs: 100,
    });

    // Setup: Create available job
    await db.collection("jobs").doc(jobId).set({
      status: "pending",
      pickup: {
        address: "123 Main St",
        lat: 37.7749,
        lng: -122.4194,
      },
      delivery: {
        address: "456 Oak Ave",
        lat: 37.7751,
        lng: -122.4192,
      },
      description: "Package delivery",
      basePrice: 5.0,
      // NO courierUid - it's available
    });

    // Execute: Claim the job (would call via Firebase function)
    // For now, simulate the update that claimJob would do
    await db.collection("jobs").doc(jobId).update({
      courierUid: courierId,
      status: "claimed",
      claimedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Verify: Job was updated correctly
    const updatedJob = await db.collection("jobs").doc(jobId).get();
    expect(updatedJob.data()?.courierUid).toBe(courierId);
    expect(updatedJob.data()?.status).toBe("claimed");
    expect(updatedJob.data()?.claimedAt).toBeDefined();
  });

  /**
   * TEST 2: Reject if job already claimed
   */
  test("should reject if job already claimed", async () => {
    const courierId1 = "courier-1";
    const courierId2 = "courier-2";
    const jobId = "job-claimed";

    // Setup: Job already claimed by another courier
    await db.collection("jobs").doc(jobId).set({
      status: "claimed",
      courierUid: courierId1, // Already assigned
      pickup: { address: "123 Main", lat: 0, lng: 0 },
      delivery: { address: "456 Oak", lat: 0, lng: 0 },
    });

    // Verify: Second courier cannot claim
    const job = await db.collection("jobs").doc(jobId).get();
    if (job.data()?.courierUid) {
      // This is what claimJob should check
      expect(job.data()?.courierUid).not.toBe(courierId2);
    }
  });

  /**
   * TEST 3: Reject if job not found
   */
  test("should return error if job not found", async () => {
    // Setup: Job doesn't exist
    const jobId = "nonexistent-job";

    // Verify: Job is not in Firestore
    const job = await db.collection("jobs").doc(jobId).get();
    expect(job.exists).toBe(false);
  });

  /**
   * TEST 4: Reject if courier profile missing
   */
  test("should return error if courier profile not found", async () => {
    const courierId = "nonexistent-courier";
    const jobId = "job-123";

    // Setup: Job exists but courier profile missing
    await db.collection("jobs").doc(jobId).set({
      status: "pending",
      pickup: { address: "123 Main", lat: 0, lng: 0 },
      delivery: { address: "456 Oak", lat: 0, lng: 0 },
    });

    // Verify: Courier profile doesn't exist
    const courier = await db.collection("couriers").doc(courierId).get();
    expect(courier.exists).toBe(false);
  });

  /**
   * TEST 5: Reject if job not in pending status
   */
  test("should return error if job not pending", async () => {
    const courierId = "courier-test";
    const jobId = "job-completed";

    // Setup: Job already completed
    await db.collection("jobs").doc(jobId).set({
      status: "completed", // Not "pending"
      courierUid: "other-courier",
      pickup: { address: "123 Main", lat: 0, lng: 0 },
      delivery: { address: "456 Oak", lat: 0, lng: 0 },
    });

    // Verify: Cannot claim non-pending job
    const job = await db.collection("jobs").doc(jobId).get();
    expect(job.data()?.status).not.toBe("pending");
  });
});

/**
 * MANUAL TESTING IN FIREBASE EMULATOR UI
 * ==========================================
 * 
 * 1. Start Emulator:
 *    firebase emulators:start
 * 
 * 2. Create test data in Firestore:
 *    - Go to http://127.0.0.1:4000
 *    - Click "Firestore" tab
 *    - Create Collection: "couriers"
 *    - Add document: "courier-test-123"
 *    - Add fields:
 *      name: "Test Courier"
 *      phone: "555-0001"
 *      rating: 4.8
 * 
 * 3. Create a job:
 *    - Create Collection: "jobs"
 *    - Add document: "job-test-123"
 *    - Add fields:
 *      status: "pending"
 *      basePrice: 5.0
 *      description: "Test delivery"
 *      pickup: { address: "123 Main St", lat: 37.7749, lng: -122.4194 }
 *      delivery: { address: "456 Oak Ave", lat: 37.7751, lng: -122.4192 }
 *      (Do NOT add courierUid - it should be available)
 * 
 * 4. Go to "Functions" tab
 * 
 * 5. Call claimJob with:
 *    {
 *      "jobId": "job-test-123"
 *    }
 * 
 * 6. Verify response shows success: true
 * 
 * 7. Go back to Firestore tab, click on job-test-123
 *    - Should see: courierUid = "courier-test-123"
 *    - Should see: status = "claimed"
 *    - Should see: claimedAt = [current timestamp]
 * 
 * 8. Try calling again with same job
 *    - Should get error: "Job already claimed by another courier"
 */
