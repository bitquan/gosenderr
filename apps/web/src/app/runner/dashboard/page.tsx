"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { getRoleDisplay } from "@gosenderr/shared";

export default function RunnerDashboardNew() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRoutes: 0,
    completedRoutes: 0,
    totalEarnings: 0,
    totalMiles: 0,
  });

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
        loadDashboard(user.uid);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadDashboard = async (userId: string) => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserProfile(userData);

        if (!userData.packageRunnerProfile) {
          router.push("/runner/onboarding");
          return;
        }

        if (userData.packageRunnerProfile.status !== "approved") {
          setLoading(false);
          return;
        }
      }

      const routesQuery = query(
        collection(db, "longHaulRoutes"),
        where("runnerId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(5),
      );
      const routesSnap = await getDocs(routesQuery);
      const routesData = routesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRoutes(routesData);

      const allRoutesQuery = query(
        collection(db, "longHaulRoutes"),
        where("runnerId", "==", userId),
      );
      const allRoutesSnap = await getDocs(allRoutesQuery);
      const allRoutes = allRoutesSnap.docs.map((doc) => doc.data());

      const completed = allRoutes.filter((r: any) => r.status === "completed");
      const totalEarnings = completed.reduce(
        (sum: number, r: any) => sum + (r.pricing?.runnerEarnings || 0),
        0,
      );
      const totalMiles = completed.reduce(
        (sum: number, r: any) => sum + (r.totalDistance || 0),
        0,
      );

      setStats({
        totalRoutes: allRoutes.length,
        completedRoutes: completed.length,
        totalEarnings,
        totalMiles,
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-purple-200 rounded-full mx-auto mb-4"></div>
            <div className="h-4 bg-purple-200 rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] p-6">
        <Card variant="elevated" className="max-w-md mx-auto">
          <CardContent>
            <h2 className="text-xl font-bold text-red-800 mb-2">
              Profile Not Found
            </h2>
            <p className="text-red-700">
              Unable to load your runner profile. Please try refreshing the
              page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = userProfile?.packageRunnerProfile?.status;

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar
                fallback={currentUser?.displayName || currentUser?.email}
                size="lg"
              />
              <div>
                <h1 className="text-2xl font-bold">
                  {currentUser?.displayName || getRoleDisplay("runner").name}
                </h1>
                <p className="text-purple-100 text-sm">{currentUser?.email}</p>
              </div>
            </div>
            <Link href="/runner/profile">
              <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                ⚙️
              </button>
            </Link>
          </div>

          {/* Quick Stats in Header */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.totalRoutes}</p>
              <p className="text-sm text-purple-100">Total Shifts</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.completedRoutes}</p>
              <p className="text-sm text-purple-100">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">
                ${stats.totalEarnings.toFixed(0)}
              </p>
              <p className="text-sm text-purple-100">Total Earned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 -mt-8 space-y-6">
        {/* Status Banner */}
        {status === "pending_review" && (
          <Card
            variant="elevated"
            className="bg-yellow-50 border-yellow-200 animate-fade-in"
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">⏳</div>
              <div>
                <h3 className="font-bold text-yellow-800 mb-1">
                  Application Under Review
                </h3>
                <p className="text-sm text-yellow-700">
                  Your application is being reviewed. You'll be notified once
                  approved.
                </p>
              </div>
            </div>
          </Card>
        )}

        {status === "approved" && (
          <Card
            variant="elevated"
            className="bg-green-50 border-green-200 animate-fade-in"
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">✅</div>
              <div>
                <h3 className="font-bold text-green-800">Active Shifter</h3>
                <p className="text-sm text-green-700">
                  You're approved and ready to accept shifts!
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="Completion Rate"
            value={
              stats.totalRoutes > 0
                ? `${((stats.completedRoutes / stats.totalRoutes) * 100).toFixed(0)}%`
                : "0%"
            }
            icon="✅"
            variant="success"
          />
          <StatCard
            title="Total Miles"
            value={stats.totalMiles.toLocaleString()}
            icon="🗺️"
            variant="purple"
          />
        </div>

        {/* Recent Routes */}
        <Card variant="elevated" className="animate-slide-up">
          <CardHeader
            action={
              <Link
                href="/runner/available-routes"
                className="text-purple-600 text-sm font-medium"
              >
                View All →
              </Link>
            }
          >
            <CardTitle>Recent Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            {routes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-5xl mb-3">📦</div>
                <p>No shifts yet</p>
                <Link
                  href="/runner/available-routes"
                  className="text-purple-600 text-sm mt-2 inline-block"
                >
                  Browse available shifts
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {routes.slice(0, 3).map((route: any) => (
                  <div
                    key={route.id}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {route.originHub?.name} → {route.destinationHub?.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {route.distance} miles • {route.packageCount} packages
                        </p>
                      </div>
                      <StatusBadge
                        status={
                          route.status === "completed"
                            ? "completed"
                            : "in_progress"
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {route.scheduledDeparture
                          ?.toDate?.()
                          .toLocaleDateString()}
                      </span>
                      <span className="font-bold text-green-600">
                        ${route.pricing?.runnerEarnings?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
