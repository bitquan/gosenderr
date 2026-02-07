import type {AuthSession} from '../../types/auth';
import type {Job, JobStatus} from '../../types/jobs';

export interface JobsServicePort {
  fetchJobs: (session: AuthSession) => Promise<Job[]>;
  getJobById: (session: AuthSession, id: string) => Promise<Job | null>;
  updateJobStatus: (session: AuthSession, id: string, nextStatus: JobStatus) => Promise<Job>;
}
