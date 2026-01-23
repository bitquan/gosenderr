import { NotFoundPage } from "@/components/ui/NotFoundPage";
import { getRoleDisplay } from "@gosenderr/shared";

export default function VendorNotFound() {
  return (
    <NotFoundPage
      title={`${getRoleDisplay("vendor").name} page not found`}
      description="That page doesn't exist."
      actionHref="/vendor/items"
      actionLabel={`Back to ${getRoleDisplay("vendor").name}`}
      emoji="🏷️"
    />
  );
}
