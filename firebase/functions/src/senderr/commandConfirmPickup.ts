import { createJobStatusCommand } from "./commandStatusBase";

export const commandConfirmPickup = createJobStatusCommand({
  requestedStatus: "picked_up",
  eventType: "job.picked_up",
  allowedFrom: ["arrived_pickup"],
  idempotentFrom: ["picked_up"],
});
