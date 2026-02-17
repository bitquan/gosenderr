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
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
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

import { enqueueCommand, flushQueue, getPendingCount } from '@/lib/offline/commandQueue'

export async function claimJob(jobId: string, courierUid: string, agreedFee: number): Promise<void> {
  const idempotencyKey = `claim_${crypto.randomUUID()}`
  const payload = { jobId, agreedFee, idempotencyKey }

  // queue when offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await enqueueCommand(courierUid, { type: 'claimJob', payload, idempotencyKey })
    return
  }

  try {
    const callable = httpsCallable<{ jobId: string; agreedFee: number; idempotencyKey?: string }, { ok: boolean; duplicate?: boolean }>(
      functions,
      'claimJob',
    );
    const res = await callable(payload)
    if (res && (res as any).data && (res as any).data.duplicate) {
      // server indicated duplicate/replay — treat as success
      return
    }
  } catch (err: any) {
    const msg = err?.message || 'Failed to claim job'
    // if offline-ish error, enqueue for later replay
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await enqueueCommand(courierUid, { type: 'claimJob', payload, idempotencyKey })
      return
    }
    throw new Error(msg)
  }
}

export async function updateJobStatus(jobId: string, nextStatus: JobStatus, actorUid?: string): Promise<void> {
  const uid = actorUid || undefined
  const idempotencyKey = `status_${crypto.randomUUID()}`
  const payload = { jobId, nextStatus, idempotencyKey }

  // queue when offline
  if (typeof navigator !== 'undefined' && !navigator.onLine && uid) {
    await enqueueCommand(uid, { type: 'updateJobStatus', payload, idempotencyKey })
    return
  }

  try {
    const callable = httpsCallable<{ jobId: string; nextStatus: JobStatus; idempotencyKey?: string }, { ok: boolean; duplicate?: boolean }>(
      functions,
      'updateJobStatus',
    );
    const res = await callable(payload)
    if (res && (res as any).data && (res as any).data.duplicate) {
      return
    }
  } catch (err: any) {
    const msg = err?.message || 'Failed to update job status'
    if (typeof navigator !== 'undefined' && !navigator.onLine && uid) {
      await enqueueCommand(uid, { type: 'updateJobStatus', payload, idempotencyKey })
      return
    }
    throw new Error(msg)
  }
}

// Process queued commands for a user (used by AuthContext on sign-in)
export async function processQueuedCommands(userUid: string) {
  if (!userUid) return
  return flushQueue(userUid, async (cmd) => {
    if (cmd.type === 'claimJob') {
      const callable = httpsCallable<{ jobId: string; agreedFee: number; idempotencyKey?: string }, any>(functions, 'claimJob')
      return callable(cmd.payload)
    }
    if (cmd.type === 'updateJobStatus') {
      const callable = httpsCallable<{ jobId: string; nextStatus: JobStatus; idempotencyKey?: string }, any>(functions, 'updateJobStatus')
      return callable(cmd.payload)
    }
    throw new Error(`unknown queued command type: ${cmd.type}`)
  })
}

