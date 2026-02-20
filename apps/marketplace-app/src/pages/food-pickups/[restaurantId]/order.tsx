import { Navigate, useParams } from "react-router-dom";

import { NotFoundPage } from "@/components/ui/NotFoundPage";
import { FoodPickupOrderForm } from "@/features/jobs/customer/FoodPickupOrderForm";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useFoodPickupRestaurant } from "@/lib/foodPickup";

export default function FoodPickupOrderPage() {
  const { restaurantId } = useParams();
  const { uid, loading: authLoading } = useAuthUser();
  const { restaurant, loading, error } = useFoodPickupRestaurant(restaurantId ?? null);

  if (!restaurantId) {
    return (
      <NotFoundPage
        title="Restaurant not found"
        description="We couldn't find that pickup location."
        actionHref="/food-pickups"
        actionLabel="Back to food pickup"
      />
    );
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading food pickup flow...</div>;
  }

  if (!uid) {
    return <Navigate to={`/login?redirect=/food-pickups/${restaurantId}/order`} replace />;
  }

  if (error || !restaurant) {
    return (
      <NotFoundPage
        title="Restaurant unavailable"
        description="This pickup location may have been removed."
        actionHref="/food-pickups"
        actionLabel="Back to food pickup"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-slate-950 px-4 py-8">
      <FoodPickupOrderForm uid={uid} restaurant={restaurant} />
    </div>
  );
}
