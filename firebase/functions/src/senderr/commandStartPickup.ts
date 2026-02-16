import { createJobStatusCommand } from "./commandStatusBase";

export const commandStartPickup = createJobStatusCommand({
  requestedStatus: "enroute_pickup",
  eventType: "job.started_pickup",
  allowedFrom: ["assigned"],
  idempotentFrom: ["enroute_pickup"],
});
