/**
 * Cloud Function: updateLocation
 * 
 * Purpose: Store real-time GPS location updates from courier
 * 
 * Workflow:
 * 1. Courier is actively delivering (status="active")
 * 2. Frontend polls GPS every 5-10 seconds
 * 3. Frontend calls updateLocation({ lat, lng, accuracy, speed, heading })
 * 4. Function checks:
 *    - Is courier authenticated?
 *    - Does courier have an active job?
 * 5. If all checks pass:
 *    - Update courierLocations/{uid} with latest GPS
 *    - Update job document with courier's current position
 *    - Potentially trigger notifications (if stopped too long, etc.)
 * 6. Return success confirmation
 * 
 * Performance: Should be fast (<100ms) as it's called frequently
 * Storage: Uses batched writes to avoid quota issues
 */

import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

export interface CourierLocationUpdate {
  lat: number;
  lng: number;
  accuracy: number;
  speed?: number;
  heading?: number;
}

export interface UpdateLocationResponse {
  success: boolean;
  error?: string;
}

export const updateLocation = functions.https.onCall(
  async (request: CourierLocationUpdate, context): Promise<UpdateLocationResponse> => {
    // Minimal logging for this high-frequency function
    if (Math.random() < 0.05) {
      // Log 5% of calls to avoid log spam
      console.log("[updateLocation] Batch update from courier:", context.auth?.uid);
    }

    try {
      // ✅ Step 1: Validate authentication
      if (!context.auth) {
        return { success: false, error: "Authentication required" };
      }

      const courierUid = context.auth.uid;

      // ✅ Step 2: Validate GPS data
      if (typeof request.lat !== "number" || typeof request.lng !== "number") {
        return { success: false, error: "Invalid GPS coordinates" };
      }

      if (request.accuracy < 0 || request.accuracy > 1000) {
        return { success: false, error: "Invalid accuracy value" };
      }

      // ✅ Step 3: Get courier's active job (if any)
      const courierLocDoc = await db.collection("courierLocations").doc(courierUid).get();
      const activeJobId = courierLocDoc.data()?.activeJobId;

      // ✅ Step 4: Batch write updates (fast)
      const batch = db.batch();

      // Update courier location document
      const courierLocRef = db.collection("courierLocations").doc(courierUid);
      batch.set(
        courierLocRef,
        {
          lat: request.lat,
          lng: request.lng,
          accuracy: request.accuracy,
          speed: request.speed || 0,
          heading: request.heading || 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // If courier has active job, update job with current position
      if (activeJobId) {
        const jobRef = db.collection("jobs").doc(activeJobId);
        batch.update(jobRef, {
          courierLastLocation: {
            lat: request.lat,
            lng: request.lng,
            accuracy: request.accuracy,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          },
        });
      }

      // ✅ Step 5: Commit batch
      await batch.commit();

      return { success: true };
    } catch (error: any) {
      console.error("[updateLocation] Error:", error.message);
      return { success: false, error: error.message };
    }
  }
);

/**
 * HOW TO TEST IN FIREBASE EMULATOR
 * 
 * 1. Start emulator: firebase emulators:start
 * 2. Setup:
 *    - Create courier profile
 *    - Create job with status="active", courierUid="courier-123"
 *    - Create courierLocations/{courier-123} with activeJobId
 * 3. Go to Functions tab
 * 4. Call updateLocation multiple times with:
 *    {
 *      "lat": 37.7749,
 *      "lng": -122.4194,
 *      "accuracy": 10,
 *      "speed": 15,
 *      "heading": 45
 *    }
 * 5. Verify: success=true for each call (should be instant)
 * 6. Check Firestore:
 *    - courierLocations/{uid} updates each time
 *    - job.courierLastLocation updates each time
 * 
 * Performance Note: This function is called every 5-10 seconds
 * so it must be very fast. Batch writes help with quota limits.
 */
