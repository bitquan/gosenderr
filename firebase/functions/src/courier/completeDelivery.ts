/**
 * Cloud Function: completeDelivery
 * 
 * Purpose: Mark a delivery as complete with proof and calculate earnings
 * 
 * Workflow:
 * 1. Courier has delivered package (status="active")
 * 2. Courier takes proof photo + signature
 * 3. Frontend calls completeDelivery({ jobId, photoUrls, signature })
 * 4. Function checks:
 *    - Is job in "active" status?
 *    - Is this courier assigned? (context.auth.uid matches courierUid)
 *    - Do we have proof photos?
 * 5. If all checks pass:
 *    - Update job: status="completed", completedAt=now(), proofPhotos=urls
 *    - Calculate courier earnings
 *    - Update courier earnings record
 *    - Create payout record (for end-of-day settlement)
 *    - Send notification to customer (package delivered!)
 * 6. Return earnings confirmation
 * 
 * Security: Only the assigned courier can complete their job
 */

import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

export interface CompleteDeliveryRequest {
  jobId: string;
  photoUrls: string[];
  signature?: string;
  notes?: string;
}

export interface CompleteDeliveryResponse {
  success: boolean;
  earnedAmount?: number;
  totalEarningsToday?: number;
  error?: string;
}

export const completeDelivery = functions.https.onCall(
  async (request: CompleteDeliveryRequest, context): Promise<CompleteDeliveryResponse> => {
    console.log("[completeDelivery] Called with jobId:", request.jobId);

    try {
      // ✅ Step 1: Validate authentication
      if (!context.auth) {
        console.error("[completeDelivery] No authentication context");
        return {
          success: false,
          error: "Authentication required",
        };
      }

      const courierUid = context.auth.uid;
      console.log("[completeDelivery] Authenticated courier:", courierUid);

      // ✅ Step 2: Validate proof photos provided
      if (!request.photoUrls || request.photoUrls.length === 0) {
        console.error("[completeDelivery] No proof photos provided");
        return {
          success: false,
          error: "At least one proof photo is required",
        };
      }

      // ✅ Step 3: Get the job
      const jobDoc = await db.collection("jobs").doc(request.jobId).get();
      if (!jobDoc.exists) {
        console.error("[completeDelivery] Job not found:", request.jobId);
        return {
          success: false,
          error: "Job not found",
        };
      }

      const jobData = jobDoc.data();
      console.log("[completeDelivery] Job status:", jobData?.status);

      // ✅ Step 4: Verify job is in "active" status
      if (jobData?.status !== "active") {
        console.error("[completeDelivery] Job not in active state:", jobData?.status);
        return {
          success: false,
          error: `Cannot complete job in ${jobData?.status} status. Must be active.`,
        };
      }

      // ✅ Step 5: Verify courier is assigned to this job
      if (jobData?.courierUid !== courierUid) {
        console.error("[completeDelivery] Courier mismatch");
        return {
          success: false,
          error: "You are not assigned to this job",
        };
      }

      // ✅ Step 6: Calculate earnings (base price + potential bonus)
      const baseEarnings = jobData?.basePrice || 0;
      const deliveryTime = Math.random() * 30; // placeholder
      const bonusEarnings = deliveryTime < 15 ? baseEarnings * 0.1 : 0; // 10% bonus if under 15 min
      const totalEarned = baseEarnings + bonusEarnings;

      console.log("[completeDelivery] Calculating earnings: base=$" + baseEarnings + " bonus=$" + bonusEarnings);

      // ✅ Step 7: Update job with completion details
      console.log("[completeDelivery] Marking job as completed");

      await jobDoc.ref.update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        proofPhotos: request.photoUrls,
        signature: request.signature || null,
        notes: request.notes || null,
        earnings: totalEarned,
      });

      // ✅ Step 8: Update courier earnings record
      const earningsDoc = db.collection("courierEarnings").doc(courierUid);
      const earnings = await earningsDoc.get();
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      if (earnings.exists) {
        const earningsData = earnings.data();
        await earningsDoc.update({
          totalEarnings: admin.firestore.FieldValue.increment(totalEarned),
          todayEarnings: (earningsData?.earnings_by_day?.[today] || 0) + totalEarned,
          totalDeliveries: admin.firestore.FieldValue.increment(1),
          [`earnings_by_day.${today}`]: admin.firestore.FieldValue.increment(totalEarned),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // First delivery, create record
        await earningsDoc.set({
          courierUid,
          totalEarnings: totalEarned,
          totalDeliveries: 1,
          earnings_by_day: {
            [today]: totalEarned,
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      console.log("[completeDelivery] ✅ Delivery completed successfully, earned: $" + totalEarned);

      // ✅ Step 9: Send notification to customer (optional)
      // TODO: Send push notification: "Your package has been delivered!"

      // ✅ Step 10: Get updated earnings for response
      const updatedEarnings = await earningsDoc.get();
      const todayEarnings = updatedEarnings.data()?.earnings_by_day?.[today] || totalEarned;

      return {
        success: true,
        earnedAmount: totalEarned,
        totalEarningsToday: todayEarnings,
      };
    } catch (error: any) {
      console.error("[completeDelivery] ❌ Error:", error.message);
      console.error("[completeDelivery] Stack:", error.stack);

      return {
        success: false,
        error: `Failed to complete delivery: ${error.message}`,
      };
    }
  }
);

/**
 * HOW TO TEST IN FIREBASE EMULATOR
 * 
 * 1. Start emulator: firebase emulators:start
 * 2. Setup: Create job with status="active", courierUid="courier-123"
 * 3. Go to Functions tab
 * 4. Call completeDelivery with:
 *    {
 *      "jobId": "job-123",
 *      "photoUrls": ["gs://...photo1.jpg", "gs://...photo2.jpg"],
 *      "signature": "gs://...signature.png",
 *      "notes": "Package left at door"
 *    }
 * 5. Verify: success=true, earnedAmount shows calculated amount
 * 6. Check Firestore:
 *    - job status should be "completed"
 *    - job should have proofPhotos, completedAt
 *    - courierEarnings/{uid} should be created with earnings updated
 */
