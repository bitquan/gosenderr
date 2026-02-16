import { createJobStatusCommand } from "./commandStatusBase";

export const commandMarkArrivedPickup = createJobStatusCommand({
  requestedStatus: "arrived_pickup",
  eventType: "job.arrived_pickup",
  allowedFrom: ["assigned", "enroute_pickup"],
  idempotentFrom: ["arrived_pickup"],
});
