import { NotFoundPage } from "@/components/ui/NotFoundPage";

export default function VendorNotFound() {
  return (
    <NotFoundPage
      title="Vendor page not found"
      description="That vendor page doesn’t exist."
      actionHref="/vendor/items"
      actionLabel="Back to Vendor"
      emoji="🏷️"
    />
  );
}
