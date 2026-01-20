"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobStatus = void 0;
// ==================== JOB STATUS ====================
var JobStatus;
(function (JobStatus) {
    JobStatus["OPEN"] = "open";
    JobStatus["ASSIGNED"] = "assigned";
    JobStatus["ENROUTE_PICKUP"] = "enroute_pickup";
    JobStatus["ARRIVED_PICKUP"] = "arrived_pickup";
    JobStatus["PICKED_UP"] = "picked_up";
    JobStatus["ENROUTE_DROPOFF"] = "enroute_dropoff";
    JobStatus["ARRIVED_DROPOFF"] = "arrived_dropoff";
    JobStatus["COMPLETED"] = "completed";
    JobStatus["CANCELLED"] = "cancelled";
    JobStatus["DISPUTED"] = "disputed";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
