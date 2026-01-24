"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import { getAuthSafe } from "@/lib/firebase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { SwipeableCard } from "@/components/ui/SwipeableCard";
import RunnerRejectModal from "@/components/v2/RunnerRejectModal";

export default function AvailableRoutesNew() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userDoc, setUserDoc] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [filterByHomeHub, setFilterByHomeHub] = useState(true);
  const [selectedRouteForReject, setSelectedRouteForReject] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      router.push("/login");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
      } else {
        setCurrentUser(user);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (currentUser && !authLoading) {
      loadUserAndRoutes();
    }
  }, [currentUser, filterByHomeHub, authLoading]);

  const loadUserAndRoutes = async () => {
    if (!currentUser || authLoading) return;

    try {
      setLoading(true);

      const userDocRef = doc(db, "users", currentUser.uid);
      const userSnapshot = await getDoc(userDocRef);

      if (!userSnapshot.exists()) {
        setError("User not found");
        return;
      }

      const userData = userSnapshot.data();
      setUserDoc(userData);

      if (!userData.packageRunnerProfile) {
        router.push("/runner/onboarding");
        return;
      }

      if (userData.packageRunnerProfile.status !== "approved") {
        setError("Your profile is not yet approved");
        return;
      }

      let routesQuery = query(
        collection(db, "longHaulRoutes"),
        where("status", "==", "available"),
      );

      if (filterByHomeHub && userData.packageRunnerProfile?.homeHub?.id) {
        routesQuery = query(
          collection(db, "longHaulRoutes"),
          where("status", "==", "available"),
          where("originHub.id", "==", userData.packageRunnerProfile.homeHub.id),
        );
      } else if (
        filterByHomeHub &&
        !userData.packageRunnerProfile?.homeHub?.id
      ) {
        // If no home hub is set, fall back to showing all available routes
        setFilterByHomeHub(false);
      }

      const routesSnapshot = await getDocs(routesQuery);
      const routesData = routesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRoutes(routesData);
    } catch (err: any) {
      console.error("Error loading routes:", err);
      if (err.code === 'permission-denied') {
        setError("Please sign in to view available routes");
        router.push("/login");
      } else {
        setError(err.message || "Failed to load routes");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRoute = async (routeId: string) => {
    if (!currentUser || accepting) return;

    try {
      setAccepting(true);
      const routeRef = doc(db, "longHaulRoutes", routeId);

      await updateDoc(routeRef, {
        status: "assigned",
        runnerId: currentUser.uid,
        assignedAt: serverTimestamp(),
      });

      router.push("/runner/dashboard");
    } catch (err: any) {
      console.error("Error accepting route:", err);
      alert(`Failed to accept route: ${err.message}`);
    } finally {
      setAccepting(false);
    }
  };

  const handleRejectSubmitted = () => {
    setSelectedRouteForReject(null);
    loadUserAndRoutes(); // Refresh the list
  };

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

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center p-6">
        <Card variant="elevated" className="max-w-md">
          <CardContent>
            <div className="text-center py-8">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-gray-900 text-lg font-bold mb-2">Error</p>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => router.push("/runner/dashboard")}
                className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold">Available Shifts</h1>
              <p className="text-purple-100 text-sm">
                {routes.length} shifts available
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="max-w-4xl mx-auto px-6 -mt-4 mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filterByHomeHub}
              onChange={(e) => setFilterByHomeHub(e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded"
            />
            <div>
              <p className="font-medium text-gray-900">Filter by Home Hub</p>
              <p className="text-sm text-gray-500">
                {userDoc?.packageRunnerProfile?.homeHub?.name ||
                  "No home hub set"}
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Routes List */}
      <div className="max-w-4xl mx-auto px-6 space-y-4">
        {routes.length === 0 ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🗺️</div>
                <p className="text-gray-600 text-lg mb-2">
                  No routes available
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  {filterByHomeHub
                    ? "Try disabling the home hub filter"
                    : "Check back later for new routes"}
                </p>
                <button
                  onClick={() => loadUserAndRoutes()}
                  className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          routes.map((route: any) => {
            const departureDate = route.scheduledDeparture?.toDate?.();
            const arrivalDate = route.scheduledArrival?.toDate?.();

            return (
              <SwipeableCard key={route.id} className="animate-fade-in">
                <Card
                  variant="elevated"
                  className="bg-gradient-to-br from-white to-purple-50"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {route.originHub?.name} → {route.destinationHub?.name}
                        </h3>
                        <div className="flex gap-3 text-sm text-gray-600">
                          <span>📍 {route.distance} miles</span>
                          <span>📦 {route.packageCount} packages</span>
                          <span>⚖️ {route.totalWeight} lbs</span>
                        </div>
                      </div>
                      <StatusBadge status="approved" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-white rounded-xl">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Departure</p>
                        <p className="text-sm font-medium">
                          {departureDate?.toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-600">
                          {departureDate?.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Arrival</p>
                        <p className="text-sm font-medium">
                          {arrivalDate?.toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-600">
                          {arrivalDate?.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Your Earnings
                          </p>
                          <p className="text-3xl font-bold text-green-600">
                            ${route.pricing?.runnerEarnings?.toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAcceptRoute(route.id)}
                          disabled={accepting}
                          className="bg-purple-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-400"
                        >
                          {accepting ? "Accepting..." : "Accept Route"}
                        </button>
                      </div>
                      <button
                        onClick={() => setSelectedRouteForReject(route.id)}
                        className="w-full px-6 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        Not interested
                      </button>
                    </div>
                  </div>
                </Card>
              </SwipeableCard>
            );
          })
        )}
      </div>

      {/* Reject Modal */}
      {selectedRouteForReject && currentUser && (
        <RunnerRejectModal
          jobId={selectedRouteForReject}
          runnerId={currentUser.uid}
          onClose={() => setSelectedRouteForReject(null)}
          onSubmit={handleRejectSubmitted}
        />
      )}
    </div>
  );
}
