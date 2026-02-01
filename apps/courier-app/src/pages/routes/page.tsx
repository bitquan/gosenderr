
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthSafe } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRoutes } from "@/hooks/useRoutes";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { RouteCard } from "@/components/RouteCard";
import { RouteDetailsModal } from "@/components/RouteDetailsModal";
import { LoadingSkeleton } from "@gosenderr/ui";
import type { RouteDoc } from "@gosenderr/shared";

export default function CourierRoutesPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<RouteDoc | null>(null);
  const {
    routes,
    loading: routesLoading,
    error,
  } = useRoutes({ status: "available" });
  const { flags, loading: flagsLoading } = useFeatureFlags();

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      navigate("/login");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleViewDetails = (route: RouteDoc) => {
    setSelectedRoute(route);
  };

  const handleAcceptRoute = async (route: RouteDoc) => {
    if (!currentUser) return;

    try {
      const routeRef = doc(db, "routes", route.routeId);
      await updateDoc(routeRef, {
        status: "claimed",
        courierId: currentUser.uid,
        courierName: currentUser.displayName || "Unknown",
        claimedAt: serverTimestamp(),
      });

      alert("Route accepted! Redirecting to active route...");
      navigate("/active-route");
    } catch (error) {
      console.error("Error accepting route:", error);
      alert("Failed to accept route. Please try again.");
    }
  };

  // Check if routes feature is enabled
  if (!flagsLoading && flags && !flags.delivery.routes) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Routes Not Available</h1>
          <p className="text-gray-600 dark:text-gray-400">
            The routes feature is currently disabled. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  if (authLoading || routesLoading || flagsLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Available Routes</h1>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6">
              <LoadingSkeleton lines={4} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4 text-red-600">
            Error Loading Routes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Available Routes</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Accept batched delivery routes for efficient earnings
        </p>
      </div>

      {routes.length === 0 ? (
        <div className="text-center py-12 glass-card">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            No available routes at the moment. Check back soon!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {routes.map((route) => (
            <RouteCard
              key={route.routeId}
              route={route}
              onViewDetails={() => handleViewDetails(route)}
              onAccept={() => handleAcceptRoute(route)}
            />
          ))}
        </div>
      )}

      {selectedRoute && (
        <RouteDetailsModal
          route={selectedRoute}
          onClose={() => setSelectedRoute(null)}
        />
      )}
      </div>
    </div>
  );
}
