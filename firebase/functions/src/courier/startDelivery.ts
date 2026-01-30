/**
 * Cloud Function: startDelivery
 * 
 * Purpose: Mark a claimed job as "active" and begin tracking
 * 
 * Workflow:
 * 1. Courier has claimed a job (status="claimed")
 * 2. Courier accepts and is ready to start delivery
 * 3. Frontend calls startDelivery({ jobId })
 * 4. Function checks:
 *    - Is job in "claimed" status?
 *    - Is this courier assigned to this job? (context.auth.uid matches courierUid)
 * 5. If all checks pass:
 *    - Update job: status="active", startedAt=now()
 *    - Create real-time tracking document
 *    - Send notification to customer (on the way!)
 * 6. Return job details with tracking info
 * 
 * Security: Only the assigned courier can start their job
 */

import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

export interface StartDeliveryRequest {
  jobId: string;
}

export interface StartDeliveryResponse {
  success: boolean;
  job?: {
    id: string;
    status: string;
    startedAt: string;
    estimatedDuration: number; // minutes
  };
  error?: string;
}

export const startDelivery = functions.https.onCall(
  async (request: StartDeliveryRequest, context): Promise<StartDeliveryResponse> => {
    console.log("[startDelivery] Called with jobId:", request.jobId);

    try {
      // ✅ Step 1: Validate authentication
      if (!context.auth) {
        console.error("[startDelivery] No authentication context");
        return {
          success: false,
          error: "Authentication required",
        };
      }

      const courierUid = context.auth.uid;
      console.log("[startDelivery] Authenticated courier:", courierUid);

      // ✅ Step 2: Get the job
      const jobDoc = await db.collection("jobs").doc(request.jobId).get();
      if (!jobDoc.exists) {
        console.error("[startDelivery] Job not found:", request.jobId);
        return {
          success: false,
          error: "Job not found",
        };
      }

      const jobData = jobDoc.data();
      console.log("[startDelivery] Job status:", jobData?.status);

      // ✅ Step 3: Verify job is in "claimed" status
      if (jobData?.status !== "claimed") {
        console.error("[startDelivery] Job not in claimed state:", jobData?.status);
        return {
          success: false,
          error: `Cannot start job in ${jobData?.status} status. Must be claimed first.`,
        };
      }

      // ✅ Step 4: Verify courier is assigned to this job
      if (jobData?.courierUid !== courierUid) {
        console.error("[startDelivery] Courier mismatch. Assigned:", jobData?.courierUid, "Caller:", courierUid);
        return {
          success: false,
          error: "You are not assigned to this job",
        };
      }

      // ✅ Step 5: Calculate estimated duration (simple: distance-based estimate)
      // TODO: Use Mapbox routing API for accurate estimates
      const estimatedDuration = Math.ceil(Math.random() * 30) + 10; // 10-40 minutes placeholder

      // ✅ Step 6: Update job to "active"
      console.log("[startDelivery] Marking job as active");

      await jobDoc.ref.update({
        status: "active",
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        estimatedCompletionTime: new Date(Date.now() + estimatedDuration * 60 * 1000).toISOString(),
      });

      // ✅ Step 7: Initialize real-time tracking document
      await db.collection("courierLocations").doc(courierUid).set(
        {
          activeJobId: request.jobId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lat: 0,
          lng: 0,
          accuracy: 0,
        },
        { merge: true }
      );

      console.log("[startDelivery] ✅ Delivery started successfully");

      // ✅ Step 8: Send notification to customer (optional - implement later)
      // TODO: Send push notification to customer: "Courier is on the way"

      // ✅ Step 9: Return confirmation
      return {
        success: true,
        job: {
          id: request.jobId,
          status: "active",
          startedAt: new Date().toISOString(),
          estimatedDuration,
        },
      };
    } catch (error: any) {
      console.error("[startDelivery] ❌ Error:", error.message);
      console.error("[startDelivery] Stack:", error.stack);

      return {
        success: false,
        error: `Failed to start delivery: ${error.message}`,
      };
    }
  }
);

/**
 * HOW TO TEST IN FIREBASE EMULATOR
 * 
 * 1. Start emulator: firebase emulators:start
 * 2. Setup test data (in Firestore tab):
 *    - Create job with: status="claimed", courierUid="courier-123"
 *    - Create courier profile: uid="courier-123"
 * 3. Go to Functions tab
 * 4. Call startDelivery({ jobId: "job-123" })
 * 5. Verify response: success=true, status="active"
 * 6. Check Firestore:
 *    - job status should be "active"
 *    - startedAt should have timestamp
 *    - courierLocations/{uid} should exist with activeJobId
 */
