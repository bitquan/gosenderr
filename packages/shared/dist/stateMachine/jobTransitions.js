"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedTransitions = void 0;
exports.canTransition = canTransition;
exports.getNextStatuses = getNextStatuses;
const firestore_1 = require("../types/firestore");
/**
 * Define allowed job status transitions for the delivery workflow
 */
exports.allowedTransitions = {
    [firestore_1.JobStatus.OPEN]: [firestore_1.JobStatus.ASSIGNED, firestore_1.JobStatus.CANCELLED],
    [firestore_1.JobStatus.ASSIGNED]: [firestore_1.JobStatus.ENROUTE_PICKUP, firestore_1.JobStatus.CANCELLED],
    [firestore_1.JobStatus.ENROUTE_PICKUP]: [firestore_1.JobStatus.ARRIVED_PICKUP, firestore_1.JobStatus.CANCELLED],
    [firestore_1.JobStatus.ARRIVED_PICKUP]: [firestore_1.JobStatus.PICKED_UP, firestore_1.JobStatus.CANCELLED],
    [firestore_1.JobStatus.PICKED_UP]: [firestore_1.JobStatus.ENROUTE_DROPOFF, firestore_1.JobStatus.CANCELLED],
    [firestore_1.JobStatus.ENROUTE_DROPOFF]: [firestore_1.JobStatus.ARRIVED_DROPOFF, firestore_1.JobStatus.CANCELLED],
    [firestore_1.JobStatus.ARRIVED_DROPOFF]: [firestore_1.JobStatus.COMPLETED, firestore_1.JobStatus.CANCELLED],
    [firestore_1.JobStatus.COMPLETED]: [],
    [firestore_1.JobStatus.CANCELLED]: [],
};
/**
 * Check if a transition from currentStatus to nextStatus is valid
 */
function canTransition(currentStatus, nextStatus) {
    const allowed = exports.allowedTransitions[currentStatus] || [];
    return allowed.includes(nextStatus);
}
/**
 * Get all statuses that can follow the current status
 */
function getNextStatuses(currentStatus) {
    return exports.allowedTransitions[currentStatus] || [];
}
