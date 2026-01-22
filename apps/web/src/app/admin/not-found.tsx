import { NotFoundPage } from "@/components/ui/NotFoundPage";

export default function AdminNotFound() {
  return (
    <NotFoundPage
      title="Admin page not found"
      description="That admin page doesn’t exist."
      actionHref="/admin/dashboard"
      actionLabel="Back to Dashboard"
      emoji="🛡️"
    />
  );
}
