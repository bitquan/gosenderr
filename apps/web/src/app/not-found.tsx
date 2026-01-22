import { NotFoundPage } from "@/components/ui/NotFoundPage";

export default function NotFound() {
  return (
    <NotFoundPage
      title="Page not found"
      description="The page you’re looking for doesn’t exist or was moved."
      actionHref="/select-role"
      actionLabel="Go to Home"
    />
  );
}
