import {
  collection,
  addDoc,
  doc,
  serverTimestamp,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import {
  GeoPoint,
  JobStatus,
  PackageInfo,
  JobPhoto,
} from "./types";

interface CreateJobPayload {
  pickup: GeoPoint;
  dropoff: GeoPoint;
  package: PackageInfo;
  photos: JobPhoto[];
}

interface JobProofPayload {
  type: "pickup" | "dropoff";
  photoUrl: string;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
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
    package: payload.package,
    photos: payload.photos,
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
  if (!courierUid) {
    throw new Error("Courier is required");
  }

  const claimCourierJobCallable = httpsCallable<
    { jobId: string; agreedFee: number },
    { success: boolean; status: JobStatus }
  >(functions, "claimCourierJob");

  await claimCourierJobCallable({ jobId, agreedFee });
}

export async function updateJobStatus(
  jobId: string,
  nextStatus: JobStatus,
  actorUid?: string,
): Promise<void> {
  if (actorUid === "") {
    throw new Error("Invalid actor");
  }

  const advanceCourierJobStatusCallable = httpsCallable<
    { jobId: string; nextStatus: JobStatus },
    { success: boolean; status: JobStatus }
  >(functions, "advanceCourierJobStatus");

  await advanceCourierJobStatusCallable({ jobId, nextStatus });
}

export async function submitCourierJobProof(
  jobId: string,
  payload: JobProofPayload,
): Promise<void> {
  const submitCourierJobProofCallable = httpsCallable<
    {
      jobId: string;
      type: "pickup" | "dropoff";
      photoUrl: string;
      coordinates: {
        latitude: number;
        longitude: number;
        accuracy: number;
      };
    },
    { success: boolean }
  >(functions, "submitCourierJobProof");

  await submitCourierJobProofCallable({ jobId, ...payload });
}

export async function submitLegacyDeliveryProof(
  jobId: string,
  photoUrl: string,
  notes?: string,
): Promise<void> {
  const submitLegacyDeliveryProofCallable = httpsCallable<
    { jobId: string; photoUrl: string; notes?: string },
    { success: boolean; status: string }
  >(functions, "submitLegacyDeliveryProof");

  await submitLegacyDeliveryProofCallable({ jobId, photoUrl, notes });
}

export async function declineCourierJobOffer(jobId: string): Promise<void> {
  const declineCourierJobOfferCallable = httpsCallable<
    { jobId: string },
    { success: boolean }
  >(functions, "declineCourierJobOffer");

  await declineCourierJobOfferCallable({ jobId });
}

export async function reassignCourierJobAdmin(
  jobId: string,
  courierUid: string,
): Promise<void> {
  const reassignCourierJobAdminCallable = httpsCallable<
    { jobId: string; courierUid: string },
    { success: boolean; status: JobStatus }
  >(functions, "reassignCourierJobAdmin");

  await reassignCourierJobAdminCallable({ jobId, courierUid });
}

export async function cancelCourierJobAdmin(jobId: string): Promise<void> {
  const cancelCourierJobAdminCallable = httpsCallable<
    { jobId: string },
    { success: boolean; status: JobStatus }
  >(functions, "cancelCourierJobAdmin");

  await cancelCourierJobAdminCallable({ jobId });
}

export async function updateLegacyCourierJobStatus(
  jobId: string,
  status: "in_progress" | "completed",
): Promise<void> {
  const updateLegacyCourierJobStatusCallable = httpsCallable<
    { jobId: string; status: "in_progress" | "completed" },
    { success: boolean; status: "in_progress" | "completed" }
  >(functions, "updateLegacyCourierJobStatus");

  await updateLegacyCourierJobStatusCallable({ jobId, status });
}

export async function rejectRunnerJob(
  jobId: string,
  reasonLabel: string,
  notes?: string,
): Promise<void> {
  const rejectRunnerJobCallable = httpsCallable<
    { jobId: string; reasonLabel: string; notes?: string },
    { success: boolean; status: JobStatus }
  >(functions, "rejectRunnerJob");

  await rejectRunnerJobCallable({ jobId, reasonLabel, notes });
}
