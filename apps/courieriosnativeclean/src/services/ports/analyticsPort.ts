export type AnalyticsEventName =
  | 'auth_signed_in'
  | 'auth_signed_out'
  | 'jobs_loaded'
  | 'job_status_updated'
  | 'tracking_started'
  | 'tracking_stopped'
  | 'tracking_error';

export interface AnalyticsServicePort {
  track: (event: AnalyticsEventName, payload?: Record<string, string | number | boolean | null>) => Promise<void>;
}
