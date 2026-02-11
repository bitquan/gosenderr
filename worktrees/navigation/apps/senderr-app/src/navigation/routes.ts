export const ROUTES = {
  HOME: "/",
  JOBS: "/jobs",
  JOB_DETAIL: (jobId: string) => `/jobs/${jobId}`,
  NAV_ACTIVE: "/navigation/active",
  SETTINGS: "/settings",
} as const;

export type RouteName = keyof typeof ROUTES;

export default ROUTES;
