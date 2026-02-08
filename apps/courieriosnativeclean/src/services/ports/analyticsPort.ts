import type {AuthSession} from '../../types/auth';

export type AnalyticsEventName =
  | 'auth_signed_in'
  | 'auth_signed_out'
  | 'jobs_loaded'
  | 'job_status_updated'
  | 'tracking_started'
  | 'tracking_stopped'
  | 'tracking_error';

export interface AnalyticsServicePort {
  initialize: () => Promise<void>;
  identifyUser: (session: AuthSession) => Promise<void>;
  clearUser: () => Promise<void>;
  track: (event: AnalyticsEventName, payload?: Record<string, string | number | boolean | null>) => Promise<void>;
  recordError: (error: unknown, context?: string) => Promise<void>;
}
