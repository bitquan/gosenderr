import { NotFoundPage } from "@/components/ui/NotFoundPage";

export default function CourierNotFound() {
  return (
    <NotFoundPage
      title="Courier page not found"
      description="That courier page doesn’t exist."
      actionHref="/dashboard"
      actionLabel="Back to Dashboard"
      emoji="🚴"
    />
  );
}
