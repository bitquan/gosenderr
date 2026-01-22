import { NotFoundPage } from "@/components/ui/NotFoundPage";

export default function CustomerNotFound() {
  return (
    <NotFoundPage
      title="Customer page not found"
      description="That customer page doesn’t exist."
      actionHref="/customer/dashboard"
      actionLabel="Back to Dashboard"
      emoji="🧾"
    />
  );
}
