/**
 * Cloud Function: claimJob
 * 
 * Purpose: Assign an available job to a courier
 * 
 * Workflow:
 * 1. Courier browsing dashboard sees available job
 * 2. Courier taps "Accept Job" button
 * 3. Frontend calls claimJob({ jobId, courierId })
 * 4. Function checks:
 *    - Is the job still available? (no courierUid)
 *    - Is the caller authenticated? (context.auth exists)
 *    - Is the caller a courier? (has courier role)
 * 5. If all checks pass:
 *    - Update job: set courierUid, status="claimed", claimedAt=now()
 *    - Send notification to customer (their job was claimed)
 * 6. Return job details to courier
 * 
 * Security: Couriers can only claim jobs, not modify/delete
 */

import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { ClaimJobRequest, ClaimJobResponse } from "./types";

const db = admin.firestore();

export const claimJob = functions.https.onCall(
  async (request: ClaimJobRequest, context): Promise<ClaimJobResponse> => {
    console.log("[claimJob] Called with jobId:", request.jobId);

    try {
      // ✅ Step 1: Validate authentication
      if (!context.auth) {
        console.error("[claimJob] No authentication context");
        return {
          success: false,
          error: "Authentication required",
        };
      }

      const courierUid = context.auth.uid;
      console.log("[claimJob] Authenticated courier:", courierUid);

      // ✅ Step 2: Validate courier role
      const courierDoc = await db.collection("couriers").doc(courierUid).get();
      if (!courierDoc.exists) {
        console.error("[claimJob] Courier profile not found:", courierUid);
        return {
          success: false,
          error: "Courier profile not found",
        };
      }

      // ✅ Step 3: Validate job exists
      const jobDoc = await db.collection("jobs").doc(request.jobId).get();
      if (!jobDoc.exists) {
        console.error("[claimJob] Job not found:", request.jobId);
        return {
          success: false,
          error: "Job not found",
        };
      }

      const jobData = jobDoc.data();
      console.log("[claimJob] Job status:", jobData?.status);

      // ✅ Step 4: Validate job is still available
      // Job must NOT have courierUid already assigned
      if (jobData?.courierUid) {
        console.error("[claimJob] Job already claimed by:", jobData.courierUid);
        return {
          success: false,
          error: "Job already claimed by another courier",
        };
      }

      // ✅ Step 5: Validate job is in "pending" status
      if (jobData?.status !== "pending") {
        console.error("[claimJob] Job not in pending state:", jobData?.status);
        return {
          success: false,
          error: `Job is not available for claiming (current status: ${jobData?.status})`,
        };
      }

      // ✅ Step 6: Update job - Assign to this courier
      console.log("[claimJob] Assigning job to courier:", courierUid);

      await jobDoc.ref.update({
        courierUid: courierUid, // Assign to this courier
        status: "claimed", // Change status from "pending" to "claimed"
        claimedAt: admin.firestore.FieldValue.serverTimestamp(), // Mark when it was claimed
        claimedBy: courierUid, // For audit trail
      });

      console.log("[claimJob] ✅ Job successfully claimed");

      // ✅ Step 7: Send notification to customer (optional - implement later)
      // TODO: Send push notification to customer: "Your delivery has been assigned to a courier"
      // await sendNotification(jobData.customerId, { type: 'job_claimed', jobId: request.jobId });

      // ✅ Step 8: Return confirmation with job details
      return {
        success: true,
        job: {
          id: request.jobId,
          pickup: jobData?.pickup || {
            address: "Unknown",
            lat: 0,
            lng: 0,
          },
          delivery: jobData?.delivery || {
            address: "Unknown",
            lat: 0,
            lng: 0,
          },
          price: jobData?.basePrice || 0,
          description: jobData?.description || "",
          claimedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error("[claimJob] ❌ Error:", error.message);
      console.error("[claimJob] Stack:", error.stack);

      // Return user-friendly error message
      return {
        success: false,
        error: `Failed to claim job: ${error.message}`,
      };
    }
  }
);

/**
 * HOW TO TEST IN FIREBASE EMULATOR
 * 
 * 1. Start emulator:
 *    firebase emulators:start
 * 
 * 2. Open http://127.0.0.1:4000
 *    (Firebase Emulator UI)
 * 
 * 3. Go to Functions tab
 * 
 * 4. Call claimJob with this test data:
 *    {
 *      "jobId": "job-123"
 *    }
 * 
 * 5. Check Firestore tab to verify job was updated:
 *    - courierUid should now be set
 *    - status should be "claimed"
 *    - claimedAt should have timestamp
 * 
 * 6. Check Terminal output for logs like:
 *    [claimJob] Called with jobId: job-123
 *    [claimJob] ✅ Job successfully claimed
 */
