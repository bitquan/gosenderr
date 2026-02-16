import { FieldValue } from "firebase-admin/firestore";

export type JobEventType =
  | "job.accepted"
  | "job.started_pickup"
  | "job.arrived_pickup"
  | "job.picked_up"
  | "job.started_dropoff"
  | "job.completed";

export type JobStatus =
  | "open"
  | "assigned"
  | "enroute_pickup"
  | "arrived_pickup"
  | "picked_up"
  | "enroute_dropoff"
  | "arrived_dropoff"
  | "completed"
  | "cancelled"
  | "disputed"
  | "expired"
  | "failed";

export type JobEventInput = {
  jobId: string;
  eventType: JobEventType;
  fromStatus: JobStatus;
  toStatus: JobStatus;
  actorUid: string;
  correlationId: string;
};

export const appendJobEvent = (
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  payload: JobEventInput,
): void => {
  const eventRef = db
    .collection("jobEvents")
    .doc(payload.jobId)
    .collection("events")
    .doc();

  tx.set(eventRef, {
    type: payload.eventType,
    jobId: payload.jobId,
    fromStatus: payload.fromStatus,
    toStatus: payload.toStatus,
    actorUid: payload.actorUid,
    correlationId: payload.correlationId,
    createdAt: FieldValue.serverTimestamp(),
  });
};
