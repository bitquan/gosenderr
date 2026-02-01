import { NotFoundPage } from "@/components/ui/NotFoundPage";

export default function UnauthorizedPage() {
  return (
    <NotFoundPage
      title="Access denied"
      description="You don't have permission to view this page."
      actionHref="/dashboard"
      actionLabel="Back to Dashboard"
      emoji="🔒"
    />
  );
}
