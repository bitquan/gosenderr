import {
  collection,
  addDoc,
  runTransaction,
  doc,
  serverTimestamp,
  updateDoc,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  GeoPoint,
  JobStatus,
  UserDoc,
  Job,
  PackageInfo,
  JobPhoto,
} from "./types";
import { calcMiles } from "./pricing";
import { getEligibilityReason } from "./eligibility";
import { getNextStatus } from "./status";

interface CreateJobPayload {
  pickup: GeoPoint;
  dropoff: GeoPoint;
  package: PackageInfo;
  photos: JobPhoto[];
  foodPickupRestaurantId?: string | null;
  foodPickupRestaurantName?: string | null;
  preferredCourierUid?: string | null;
  offerCourierUid?: string | null;
  offerQueue?: string[];
  offerStatus?: "pending" | "open" | "expired" | "declined" | "accepted";
  offerExpiresAt?: Timestamp | null;
  pricing?: {
    courierRate: number;
    platformFee: number;
    totalAmount: number;
  };
  paymentStatus?: "pending" | "authorized" | "captured" | "refunded";
  paymentIntentId?: string | null;
}

export async function createJob(
  userUid: string,
  payload: CreateJobPayload,
): Promise<string> {
  const jobsRef = collection(db, "jobs");
  const docRef = await addDoc(jobsRef, {
    createdByUid: userUid,
    status: "open" as JobStatus,
    pickup: payload.pickup,
    dropoff: payload.dropoff,
    foodPickupRestaurantId: payload.foodPickupRestaurantId ?? null,
    foodPickupRestaurantName: payload.foodPickupRestaurantName ?? null,
    package: payload.package,
    photos: payload.photos,
    preferredCourierUid: payload.preferredCourierUid ?? null,
    offerCourierUid: payload.offerCourierUid ?? null,
    offerQueue: payload.offerQueue ?? [],
    offerStatus: payload.offerStatus ?? "open",
    offerExpiresAt: payload.offerExpiresAt ?? null,
    pricing: payload.pricing,
    paymentStatus: payload.paymentStatus ?? "pending",
    paymentIntentId: payload.paymentIntentId ?? null,
    courierUid: null,
    agreedFee: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function cancelJob(jobId: string, userUid: string): Promise<void> {
  const jobRef = doc(db, "jobs", jobId);
  const jobSnap = await getDoc(jobRef);

  if (!jobSnap.exists()) {
    throw new Error("Job not found");
  }

  const jobData = jobSnap.data();

  // Only the creator can cancel
  if (jobData.createdByUid !== userUid) {
    throw new Error("Only the job creator can cancel this job");
  }

  // Can only cancel if status is 'open' or 'assigned'
  if (jobData.status !== "open" && jobData.status !== "assigned") {
    throw new Error("Job can only be cancelled if status is open or assigned");
  }

  await updateDoc(jobRef, {
    status: "cancelled" as JobStatus,
    updatedAt: serverTimestamp(),
  });
}

export async function claimJob(
  jobId: string,
  courierUid: string,
  agreedFee: number,
): Promise<void> {
  const jobRef = doc(db, "jobs", jobId);
  const courierRef = doc(db, "users", courierUid);

  await runTransaction(db, async (transaction) => {
    const jobDoc = await transaction.get(jobRef);
    const courierDoc = await transaction.get(courierRef);

    if (!jobDoc.exists()) {
      throw new Error("Job not found");
    }

    if (!courierDoc.exists()) {
      throw new Error("Courier not found");
    }

    const jobData = jobDoc.data();
    const courierData = courierDoc.data() as UserDoc;

    if (jobData.status !== "open" || jobData.courierUid !== null) {
      throw new Error("Job already claimed or not available");
    }

    // Server-side eligibility check - use courierProfile
    if (!courierData.courierProfile?.currentLocation) {
      throw new Error("Senderr location not available");
    }

    // Determine appropriate rate card based on job type
    const isFoodJob = jobData.isFoodItem || false;
    const rateCard = isFoodJob
      ? courierData.courierProfile.foodRateCard
      : courierData.courierProfile.packageRateCard;

    if (!rateCard) {
      throw new Error(
        `Senderr ${isFoodJob ? "food" : "package"} rate card not configured`,
      );
    }

    const courierLocation = courierData.courierProfile.currentLocation;
    const pickup = jobData.pickup as GeoPoint;
    const dropoff = jobData.dropoff as GeoPoint;

    const pickupMiles = calcMiles(courierLocation, pickup);
    const jobMiles = calcMiles(pickup, dropoff);

    const eligibilityResult = getEligibilityReason(
      rateCard,
      jobMiles,
      pickupMiles,
    );

    if (!eligibilityResult.eligible) {
      throw new Error(
        `not-eligible: ${eligibilityResult.reason || "Job exceeds distance limits"}`,
      );
    }

    // All checks passed - claim the job
    transaction.update(jobRef, {
      courierUid,
      agreedFee,
      status: "assigned" as JobStatus,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function updateJobStatus(
  jobId: string,
  nextStatus: JobStatus,
  actorUid?: string,
): Promise<void> {
  const jobRef = doc(db, "jobs", jobId);

  await runTransaction(db, async (transaction) => {
    const jobDoc = await transaction.get(jobRef);

    if (!jobDoc.exists()) {
      throw new Error("Job not found");
    }

    const jobData = jobDoc.data() as Job;

    // Server-side guard: Only assigned courier can update status
    if (actorUid && jobData.courierUid !== actorUid) {
      throw new Error("Only the assigned courier can update job status");
    }

    // Validate status progression
    const expectedNextStatus = getNextStatus(jobData.status);
    if (!expectedNextStatus) {
      throw new Error(`Cannot advance from status: ${jobData.status}`);
    }

    if (nextStatus !== expectedNextStatus) {
      throw new Error(
        `Invalid status transition. Expected: ${expectedNextStatus}, Received: ${nextStatus}`,
      );
    }

    // All checks passed - update status
    transaction.update(jobRef, {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  });
}
