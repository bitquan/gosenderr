import {
  commandAcceptJob,
  commandCompleteDelivery,
  commandConfirmPickup,
  commandMarkArrivedPickup,
  commandStartDropoff,
  commandStartPickup,
  fetchJobs,
  getJobById,
  subscribeJobs,
  updateJobStatus,
} from '../jobsService';
import type {JobsServicePort} from '../ports/jobsPort';

export const jobsFirebaseAdapter: JobsServicePort = {
  fetchJobs,
  getJobById,
  updateJobStatus,
  commandAcceptJob,
  commandStartPickup,
  commandMarkArrivedPickup,
  commandConfirmPickup,
  commandStartDropoff,
  commandCompleteDelivery,
  subscribeJobs,
  attachProof: async (session, id, type, proof) => {
    // Delegate to the core service implementation which handles Firebase/local fallback.
    return await (await import('../jobsService')).attachProof(session, id, type, proof);
  },
};
