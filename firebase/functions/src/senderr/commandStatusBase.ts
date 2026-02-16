import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { appendJobEvent, type JobEventType, type JobStatus } from "./events";

export type CommandJobStatusRequest = {
  jobId?: string;
  correlationId?: string;
};

export type CommandJobStatusResult = {
  kind: "success" | "conflict" | "fatal_error";
  requestedStatus: JobStatus;
  idempotent: boolean;
  message: string | null;
  correlationId: string;
  job: Record<string, unknown> | null;
};

type CommandStatusConfig = {
  requestedStatus: JobStatus;
  eventType: JobEventType;
  allowedFrom: readonly JobStatus[];
  idempotentFrom?: readonly JobStatus[];
};

const JOB_STATUSES: ReadonlySet<JobStatus> = new Set([
  "open",
  "assigned",
  "enroute_pickup",
  "arrived_pickup",
  "picked_up",
  "enroute_dropoff",
  "arrived_dropoff",
  "completed",
  "cancelled",
  "disputed",
  "expired",
  "failed",
]);

const toIsoString = (value: unknown): string => {
  if (value && typeof value === "object" && "toDate" in value) {
    const timestamp = value as { toDate: () => Date };
    return timestamp.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return new Date().toISOString();
};

const normalizeJobData = (
  jobId: string,
  data: Record<string, unknown>,
): Record<string, unknown> => ({
  id: jobId,
  ...data,
  updatedAt: toIsoString(data.updatedAt),
});

const correlationIdOrGenerated = (value: unknown): string => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return `corr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeStatus = (value: unknown): JobStatus => {
  if (typeof value !== "string") {
    return "open";
  }
  const status = value.trim().toLowerCase();
  if (JOB_STATUSES.has(status as JobStatus)) {
    return status as JobStatus;
  }
  return "open";
};

export const createJobStatusCommand = (config: CommandStatusConfig) =>
  onCall<CommandJobStatusRequest>(
    {
      cors: true,
      region: "us-central1",
    },
    async (request): Promise<CommandJobStatusResult> => {
      const uid = request.auth?.uid;
      if (!uid) {
        throw new HttpsError("unauthenticated", "You must be signed in.");
      }

      const jobId = request.data?.jobId?.trim();
      if (!jobId) {
        throw new HttpsError("invalid-argument", "jobId is required.");
      }

      const correlationId = correlationIdOrGenerated(request.data?.correlationId);
      const db = getFirestore();
      const jobRef = db.collection("jobs").doc(jobId);
      const idempotentStatuses = new Set<JobStatus>([
        config.requestedStatus,
        ...(config.idempotentFrom ?? []),
      ]);

      const txResult = await db.runTransaction(async tx => {
        const snap = await tx.get(jobRef);
        if (!snap.exists) {
          throw new HttpsError("not-found", "Job not found.");
        }

        const raw = snap.data() as Record<string, unknown>;
        const currentStatus = normalizeStatus(raw.status);
        const existingCourierUid =
          typeof raw.courierUid === "string" ? raw.courierUid : "";

        if (existingCourierUid && existingCourierUid !== uid) {
          throw new HttpsError(
            "failed-precondition",
            "Job is assigned to another courier.",
          );
        }

        if (idempotentStatuses.has(currentStatus)) {
          return { idempotent: true };
        }

        if (!config.allowedFrom.includes(currentStatus)) {
          throw new HttpsError(
            "failed-precondition",
            `Cannot set job to "${config.requestedStatus}" from "${currentStatus}".`,
          );
        }

        tx.update(jobRef, {
          status: config.requestedStatus,
          courierUid: uid,
          updatedAt: FieldValue.serverTimestamp(),
        });

        appendJobEvent(tx, db, {
          jobId,
          eventType: config.eventType,
          fromStatus: currentStatus,
          toStatus: config.requestedStatus,
          actorUid: uid,
          correlationId,
        });

        return { idempotent: false };
      });

      const updatedSnap = await jobRef.get();
      if (!updatedSnap.exists) {
        return {
          kind: "fatal_error",
          requestedStatus: config.requestedStatus,
          idempotent: false,
          message: "Job updated but readback failed.",
          correlationId,
          job: null,
        };
      }

      const updated = normalizeJobData(
        updatedSnap.id,
        updatedSnap.data() as Record<string, unknown>,
      );
      return {
        kind: "success",
        requestedStatus: config.requestedStatus,
        idempotent: txResult.idempotent,
        message: null,
        correlationId,
        job: updated,
      };
    },
  );
