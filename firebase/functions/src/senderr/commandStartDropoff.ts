import { createJobStatusCommand } from "./commandStatusBase";

export const commandStartDropoff = createJobStatusCommand({
  requestedStatus: "enroute_dropoff",
  eventType: "job.started_dropoff",
  allowedFrom: ["picked_up"],
  idempotentFrom: ["enroute_dropoff"],
});
