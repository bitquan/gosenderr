"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/Badge";
import { BottomNav, runnerNavItems } from "@/components/ui/BottomNav";

export default function RunnerEarningsNew() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<
    "all" | "week" | "month" | "year"
  >("all");

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
    if (!currentUser) return;

    const routesQuery = query(
      collection(db, "longHaulRoutes"),
      where("runnerId", "==", currentUser.uid),
      where("status", "==", "completed"),
      orderBy("completedAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      routesQuery,
      (snapshot) => {
        const routesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRoutes(routesData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading routes:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  const getFilteredRoutes = () => {
    if (dateFilter === "all") return routes;

    const now = new Date();
    const filterDate = new Date();

    if (dateFilter === "week") {
      filterDate.setDate(now.getDate() - 7);
    } else if (dateFilter === "month") {
      filterDate.setMonth(now.getMonth() - 1);
    } else if (dateFilter === "year") {
      filterDate.setFullYear(now.getFullYear() - 1);
    }

    return routes.filter((route) => {
      const completedAt = route.completedAt?.toDate?.();
      return completedAt && completedAt >= filterDate;
    });
  };

  const filteredRoutes = getFilteredRoutes();
  const totalEarnings = filteredRoutes.reduce(
    (sum, route) => sum + (route.pricing?.runnerEarnings || 0),
    0,
  );
  const totalMiles = filteredRoutes.reduce(
    (sum, route) => sum + (route.distance || 0),
    0,
  );
  const avgPerRoute =
    filteredRoutes.length > 0 ? totalEarnings / filteredRoutes.length : 0;

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
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold">Earnings</h1>
              <p className="text-purple-100 text-sm">
                {filteredRoutes.length} completed routes
              </p>
            </div>
          </div>

          {/* Total Earnings Display */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
            <p className="text-sm text-purple-100 mb-2">Total Earnings</p>
            <p className="text-5xl font-bold mb-2">
              ${totalEarnings.toFixed(2)}
            </p>
            <p className="text-sm text-purple-100">
              {dateFilter === "all" ? "All time" : `Last ${dateFilter}`}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-4xl mx-auto px-6 -mt-4 mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2">
          {[
            { label: "All Time", value: "all" },
            { label: "This Week", value: "week" },
            { label: "This Month", value: "month" },
            { label: "This Year", value: "year" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setDateFilter(tab.value as any)}
              className={`flex-1 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                dateFilter === tab.value
                  ? "bg-purple-600 text-white"
                  : "text-gray-600 hover:bg-purple-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Total Miles"
            value={totalMiles.toFixed(0)}
            icon="🛣️"
            variant="default"
          />
          <StatCard
            title="Avg/Route"
            value={`$${avgPerRoute.toFixed(2)}`}
            icon="💰"
            variant="success"
          />
        </div>

        {/* Earnings History */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Earnings History</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRoutes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💸</div>
                <p className="text-gray-600 text-lg mb-2">No earnings yet</p>
                <p className="text-gray-500 text-sm">
                  Complete routes to start earning
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRoutes.map((route: any) => (
                  <div
                    key={route.id}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 mb-1">
                          {route.originHub?.name} → {route.destinationHub?.name}
                        </p>
                        <div className="flex gap-3 text-sm text-gray-500">
                          <span>📍 {route.distance} miles</span>
                          <span>📦 {route.packageCount} packages</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          ${route.pricing?.runnerEarnings?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {route.completedAt?.toDate?.().toLocaleDateString()}
                      </span>
                      <StatusBadge status="completed" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav items={runnerNavItems} />
    </div>
  );
}
