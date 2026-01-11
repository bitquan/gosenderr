"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobStatus = void 0;
var JobStatus;
(function (JobStatus) {
    JobStatus["OPEN"] = "open";
    JobStatus["ASSIGNED"] = "assigned";
    JobStatus["ENROUTE_PICKUP"] = "enroute_pickup";
    JobStatus["PICKED_UP"] = "picked_up";
    JobStatus["ENROUTE_DROPOFF"] = "enroute_dropoff";
    JobStatus["DELIVERED"] = "delivered";
    JobStatus["CANCELLED"] = "cancelled";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
