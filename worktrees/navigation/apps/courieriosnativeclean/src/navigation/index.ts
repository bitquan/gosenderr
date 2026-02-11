// Minimal native navigation abstraction (to be expanded)
export type NativeRouteName =
  | "Jobs"
  | "JobDetail"
  | "NavigationActive"
  | "Settings";

export function navigateToJob(navigation: any, jobId: string) {
  if (!navigation) return;
  navigation.navigate("JobDetail", { jobId });
}

export function openActiveNavigation(navigation: any) {
  if (!navigation) return;
  navigation.navigate("NavigationActive");
}
