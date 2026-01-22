"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSafe } from "@/lib/firebase/auth";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { BottomNav, adminNavItems } from "@/components/ui/BottomNav";
import { Avatar } from "@/components/ui/Avatar";

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
      router.push("/admin-login");
      return;
    }
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/admin-login");
        return;
      }

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists() || userDoc.data()?.role !== "admin") {
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
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-purple-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-purple-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar
                fallback={currentUser?.displayName || "Admin"}
                size="lg"
              />
              <div>
                <h1 className="text-2xl font-bold">Route Management</h1>
                <p className="text-purple-100 text-sm">
                  {routes.length} total routes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-4xl mx-auto px-6 -mt-4 mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 overflow-x-auto">
          {[
            { label: "All", value: "all" },
            { label: "Available", value: "available" },
            { label: "Assigned", value: "assigned" },
            { label: "In Progress", value: "in_progress" },
            { label: "Completed", value: "completed" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                filter === tab.value
                  ? "bg-purple-600 text-white"
                  : "text-gray-600 hover:bg-purple-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Routes List */}
      <div className="max-w-4xl mx-auto px-6 space-y-4">
        {filteredRoutes.length === 0 ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🚗</div>
                <p className="text-gray-600 text-lg">No routes found</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredRoutes.map((route) => (
            <Card
              key={route.id}
              variant="elevated"
              className="hover-lift animate-fade-in"
            >
              <CardContent>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">🚗</span>
                      <div>
                        <div className="font-bold text-lg">
                          {route.routeId || route.id}
                        </div>
                        <div className="text-xs text-purple-600 font-medium">
                          {route.type === "local"
                            ? "Local Route"
                            : route.type === "long"
                              ? "Long Route"
                              : "Long Haul Route"}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500 text-xs">Packages</div>
                        <div className="font-semibold">
                          {route.totalJobs || route.totalPackages || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Distance</div>
                        <div className="font-semibold">
                          {route.totalDistance?.toFixed(1) || "0"} mi
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Earnings</div>
                        <div className="font-semibold text-green-600">
                          $
                          {route.pricing?.courierEarnings?.toFixed(2) ||
                            route.pricing?.runnerEarnings?.toFixed(2) ||
                            "0.00"}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Date</div>
                        <div className="font-medium">
                          {route.scheduledDate
                            ?.toDate?.()
                            ?.toLocaleDateString() ||
                            route.createdAt?.toDate?.()?.toLocaleDateString() ||
                            "Unknown"}
                        </div>
                      </div>
                    </div>

                    {(route.courierId || route.runnerId) && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500">Assigned to</div>
                        <div className="font-medium text-sm">
                          {route.courierName ||
                            route.runnerName ||
                            (route.courierId || route.runnerId)?.slice(0, 8)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={route.status || "available"} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <BottomNav items={adminNavItems} />
    </div>
  );
}
