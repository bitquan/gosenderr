import { NotFoundPage } from "@/components/ui/NotFoundPage";

export default function RunnerNotFound() {
  return (
    <NotFoundPage
      title="Runner page not found"
      description="That runner page doesn’t exist."
      actionHref="/runner/dashboard"
      actionLabel="Back to Dashboard"
      emoji="🏃"
    />
  );
}
