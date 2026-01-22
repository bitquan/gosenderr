import { NotFoundPage } from "@/components/ui/NotFoundPage";

export default function MarketplaceNotFound() {
  return (
    <NotFoundPage
      title="Marketplace page not found"
      description="That marketplace page doesn’t exist."
      actionHref="/marketplace"
      actionLabel="Back to Marketplace"
      emoji="🛍️"
    />
  );
}
