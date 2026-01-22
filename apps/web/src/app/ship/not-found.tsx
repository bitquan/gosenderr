import { NotFoundPage } from "@/components/ui/NotFoundPage";

export default function ShipNotFound() {
  return (
    <NotFoundPage
      title="Shipping page not found"
      description="That shipping page doesn’t exist."
      actionHref="/ship"
      actionLabel="Start Shipping"
      emoji="📦"
    />
  );
}
