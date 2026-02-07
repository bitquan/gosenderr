import {
  fetchJobs,
  getJobById,
  updateJobStatus,
} from '../jobsService';
import type {JobsServicePort} from '../ports/jobsPort';

export const jobsFirebaseAdapter: JobsServicePort = {
  fetchJobs,
  getJobById,
  updateJobStatus,
};
