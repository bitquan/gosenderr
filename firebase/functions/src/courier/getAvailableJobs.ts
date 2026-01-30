/**
 * Cloud Function: getAvailableJobs
 * 
 * Purpose: Query nearby available jobs for courier to claim
 * 
 * Workflow:
 * 1. Courier opens dashboard (status="online")
 * 2. Frontend has courier's GPS location
 * 3. Frontend calls getAvailableJobs({ lat, lng, limit })
 * 4. Function queries:
 *    - All jobs with status="pending" (not yet claimed)
 *    - Within ~5 miles of courier's location
 *    - Calculate distance to each job
 *    - Estimate delivery time (based on distance + traffic)
 * 5. Sort by distance (closest first)
 * 6. Return list of available jobs with estimated earnings/time
 * 
 * Real-time: Frontend should call every 30 seconds or when courier moves
 * Optimization: Consider caching top N nearby jobs server-side
 */

import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

export interface GetAvailableJobsRequest {
  lat: number;
  lng: number;
  limit?: number;
  maxDistance?: number; // miles
}

export interface AvailableJob {
  id: string;
  pickup: { address: string; lat: number; lng: number };
  delivery: { address: string; lat: number; lng: number };
  price: number;
  distance: number;
  estimatedTime: number;
}

export interface GetAvailableJobsResponse {
  success: boolean;
  jobs?: AvailableJob[];
  totalCount?: number;
  error?: string;
}

// Helper: Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Estimate delivery time (simple: 1 minute per mile + 5 min pickup)
function estimateDeliveryTime(pickupDistance: number, deliveryDistance: number): number {
  return Math.ceil(pickupDistance * 1.5 + deliveryDistance * 1.5 + 5);
}

export const getAvailableJobs = functions.https.onCall(
  async (request: GetAvailableJobsRequest, context): Promise<GetAvailableJobsResponse> => {
    console.log("[getAvailableJobs] Query from courier at:", request.lat, request.lng);

    try {
      // ✅ Step 1: Validate authentication
      if (!context.auth) {
        console.error("[getAvailableJobs] No authentication context");
        return {
          success: false,
          error: "Authentication required",
        };
      }

      const courierUid = context.auth.uid;
      console.log("[getAvailableJobs] Authenticated courier:", courierUid);

      // ✅ Step 2: Validate GPS coordinates
      if (typeof request.lat !== "number" || typeof request.lng !== "number") {
        return {
          success: false,
          error: "Invalid GPS coordinates",
        };
      }

      const limit = request.limit || 10;
      const maxDistance = request.maxDistance || 5; // 5 miles default

      // ✅ Step 3: Query all pending jobs
      // NOTE: This is a simple collection scan. For production, use:
      // - Firestore geohashing for geo-queries
      // - Algolia for advanced search
      // - Cloud Functions with batched queries
      console.log("[getAvailableJobs] Querying pending jobs...");

      const jobsSnapshot = await db.collection("jobs").where("status", "==", "pending").limit(100).get();

      const availableJobs: AvailableJob[] = [];

      // ✅ Step 4: Filter by distance and calculate details
      for (const jobDoc of jobsSnapshot.docs) {
        const job = jobDoc.data();

        // Calculate distance to pickup location
        const pickupDistance = calculateDistance(request.lat, request.lng, job.pickup.lat, job.pickup.lng);

        // Only include jobs within max distance
        if (pickupDistance > maxDistance) {
          continue;
        }

        // Calculate distance from pickup to delivery
        const deliveryDistance = calculateDistance(job.pickup.lat, job.pickup.lng, job.delivery.lat, job.delivery.lng);

        // Calculate estimated time
        const estimatedTime = estimateDeliveryTime(pickupDistance, deliveryDistance);

        availableJobs.push({
          id: jobDoc.id,
          pickup: {
            address: job.pickup.address,
            lat: job.pickup.lat,
            lng: job.pickup.lng,
          },
          delivery: {
            address: job.delivery.address,
            lat: job.delivery.lat,
            lng: job.delivery.lng,
          },
          price: job.basePrice || 0,
          distance: Math.round(pickupDistance * 10) / 10, // Round to 1 decimal
          estimatedTime,
        });
      }

      // ✅ Step 5: Sort by distance (closest first)
      availableJobs.sort((a, b) => a.distance - b.distance);

      // ✅ Step 6: Limit results
      const limited = availableJobs.slice(0, limit);

      console.log("[getAvailableJobs] ✅ Found " + limited.length + " jobs within " + maxDistance + " miles");

      return {
        success: true,
        jobs: limited,
        totalCount: availableJobs.length,
      };
    } catch (error: any) {
      console.error("[getAvailableJobs] ❌ Error:", error.message);
      console.error("[getAvailableJobs] Stack:", error.stack);

      return {
        success: false,
        error: `Failed to get available jobs: ${error.message}`,
      };
    }
  }
);

/**
 * HOW TO TEST IN FIREBASE EMULATOR
 * 
 * 1. Start emulator: firebase emulators:start
 * 2. Setup: Create multiple jobs with status="pending":
 *    - Job 1: pickup at (37.7749, -122.4194), base price $5
 *    - Job 2: pickup at (37.7750, -122.4195), base price $7
 *    - Job 3: pickup at (38.0, -123.0), base price $10 (too far)
 * 3. Go to Functions tab
 * 4. Call getAvailableJobs:
 *    {
 *      "lat": 37.7749,
 *      "lng": -122.4194,
 *      "limit": 10,
 *      "maxDistance": 5
 *    }
 * 5. Verify: Returns jobs sorted by distance
 * 6. Check output shows:
 *    - Correct distance calculations
 *    - Correct estimated times
 *    - Only jobs within 5 miles
 *    - Sorted closest first
 * 
 * PRODUCTION NOTES:
 * - This currently scans up to 100 jobs. For larger scale:
 *   - Use Firestore geohashing library (geohash-0.13.0)
 *   - Implement region-based queries (divide area into grid)
 *   - Cache results for 30 seconds
 *   - Use Algolia for advanced search
 */
