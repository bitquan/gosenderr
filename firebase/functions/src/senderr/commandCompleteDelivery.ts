import { createJobStatusCommand } from "./commandStatusBase";

export const commandCompleteDelivery = createJobStatusCommand({
  requestedStatus: "completed",
  eventType: "job.completed",
  allowedFrom: ["enroute_dropoff", "arrived_dropoff"],
  idempotentFrom: ["completed"],
});
