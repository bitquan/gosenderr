import { createJobStatusCommand } from "./commandStatusBase";

export const commandAcceptJob = createJobStatusCommand({
  requestedStatus: "assigned",
  eventType: "job.accepted",
  allowedFrom: ["open"],
  idempotentFrom: ["assigned"],
});
