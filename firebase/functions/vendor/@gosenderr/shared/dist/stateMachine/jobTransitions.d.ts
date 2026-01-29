import { JobStatus } from '../types/firestore';
/**
 * Define allowed job status transitions for the delivery workflow
 */
export declare const allowedTransitions: Record<JobStatus, JobStatus[]>;
/**
 * Check if a transition from currentStatus to nextStatus is valid
 */
export declare function canTransition(currentStatus: JobStatus, nextStatus: JobStatus): boolean;
/**
 * Get all statuses that can follow the current status
 */
export declare function getNextStatuses(currentStatus: JobStatus): JobStatus[];
