import { NotFoundPage } from "@/components/ui/NotFoundPage";

export default function TrackNotFound() {
  return (
    <NotFoundPage
      title="Tracking page not found"
      description="We couldn’t find that tracking page."
      actionHref="/track/package"
      actionLabel="Track a Package"
      emoji="📍"
    />
  );
}
