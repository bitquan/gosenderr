"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSafe } from "@/lib/firebase/auth";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { GlassCard, LoadingSkeleton } from "@/components/GlassCard";

export default function AdminRoutesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      router.push("/login");
      return;
    }
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const tokenResult = await user.getIdTokenResult();
      if (!tokenResult.claims.admin) {
        alert("Access denied. Admin privileges required.");
        router.push("/");
        return;
      }

      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      loadRoutes();
    }
  }, [currentUser]);

  const loadRoutes = async () => {
    try {
      const routesQuery = query(
        collection(db, "routes"),
        orderBy("createdAt", "desc"),
      );
      const routesSnap = await getDocs(routesQuery);
      const routesData = routesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRoutes(routesData);
    } catch (error) {
      console.error("Error loading routes:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoutes = routes.filter((route) => {
    if (filter === "all") return true;
    return route.status === filter;
  });

  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Route Management</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {routes.length} total routes
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { label: "All", value: "all" },
          { label: "Available", value: "available" },
          { label: "Claimed", value: "claimed" },
          { label: "In Progress", value: "in_progress" },
          { label: "Completed", value: "completed" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              filter === tab.value
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Routes Grid */}
      <div className="grid gap-4">
        {filteredRoutes.length === 0 ? (
          <GlassCard>
            <p className="text-center py-12 text-gray-500">No routes found</p>
          </GlassCard>
        ) : (
          filteredRoutes.map((route) => (
            <GlassCard key={route.id}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🚗</span>
                    <div>
                      <div className="font-semibold">{route.routeId}</div>
                      <div className="text-xs text-gray-500">
                        {route.type === "local"
                          ? "Local Route"
                          : route.type === "long"
                            ? "Long Route"
                            : "Long Haul Route"}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Jobs:</span>{" "}
                      {route.totalJobs || route.totalPackages || 0}
                    </div>
                    <div>
                      <span className="text-gray-500">Distance:</span>{" "}
                      {route.totalDistance?.toFixed(1) || "0"} mi
                    </div>
                    <div>
                      <span className="text-gray-500">Earnings:</span> $
                      {route.pricing?.courierEarnings?.toFixed(2) ||
                        route.pricing?.runnerEarnings?.toFixed(2) ||
                        "0.00"}
                    </div>
                    {route.courierId && (
                      <div>
                        <span className="text-gray-500">Courier:</span>{" "}
                        {route.courierName || route.courierId.slice(0, 8)}
                      </div>
                    )}
                    {route.runnerId && (
                      <div>
                        <span className="text-gray-500">Runner:</span>{" "}
                        {route.runnerName || route.runnerId.slice(0, 8)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      route.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : route.status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : route.status === "claimed"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {route.status?.replace(/_/g, " ") || "Unknown"}
                  </span>
                  <div className="text-sm text-gray-500">
                    {route.scheduledDate?.toDate?.()?.toLocaleDateString() ||
                      route.createdAt?.toDate?.()?.toLocaleDateString() ||
                      "Unknown"}
                  </div>
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      <div className="text-sm text-gray-500">
        💡 <strong>Note:</strong> Advanced route management features (manual
        route creation, reassignment, optimization, etc.) will be implemented in
        a future update.
      </div>
    </div>
  );
}
