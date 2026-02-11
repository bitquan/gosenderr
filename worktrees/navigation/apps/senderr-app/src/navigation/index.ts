import ROUTES from "./routes";

export function openJob(jobId: string) {
  // For Next.js, navigate programmatically
  if (typeof window !== "undefined") {
    window.location.href = ROUTES.JOB_DETAIL(jobId);
    return;
  }
}

export function goToActiveNavigation() {
  if (typeof window !== "undefined") {
    window.location.href = ROUTES.NAV_ACTIVE;
  }
}

export { ROUTES };
