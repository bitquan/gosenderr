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
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Avatar } from "@/components/ui/Avatar";

export default function AdminDashboardNew() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPackages: 0,
    totalRoutes: 0,
    pendingEquipment: 0,
    pendingRunners: 0,
  });

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

      // Check if user is admin
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
      loadStats();
    }
  }, [currentUser]);

  const loadStats = async () => {
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const totalUsers = usersSnap.size;

      const packagesSnap = await getDocs(collection(db, "packages"));
      const totalPackages = packagesSnap.size;

      const routesSnap = await getDocs(collection(db, "routes"));
      const totalRoutes = routesSnap.size;

      // Try to get equipment submissions, but don't fail if permission denied
      let pendingEquipment = 0;
      try {
        const equipmentSnap = await getDocs(
          collection(db, "equipmentSubmissions"),
        );
        pendingEquipment = equipmentSnap.docs.filter(
          (doc) => doc.data().status === "pending",
        ).length;
      } catch (err) {
        console.warn("Could not load equipment submissions:", err);
      }

      const pendingRunners = usersSnap.docs.filter(
        (doc) => doc.data().packageRunnerProfile?.status === "pending_review",
      ).length;

      setStats({
        totalUsers,
        totalPackages,
        totalRoutes,
        pendingEquipment,
        pendingRunners,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      // Set loading to false even if there's an error so UI can render
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

  const managementItems = [
    {
      title: "User Management",
      description: "View and manage all users",
      icon: "👥",
      href: "/admin/users",
      color: "bg-blue-50 text-blue-600",
      count: stats.totalUsers,
    },
    {
      title: "Runner Approvals",
      description: "Review pending runner applications",
      icon: "🚚",
      href: "/admin/runners",
      color: "bg-orange-50 text-orange-600",
      count: stats.pendingRunners,
      badge: stats.pendingRunners > 0,
    },
    {
      title: "Equipment Review",
      description: "Verify courier equipment submissions",
      icon: "🔧",
      href: "/admin/equipment-review",
      color: "bg-yellow-50 text-yellow-600",
      count: stats.pendingEquipment,
      badge: stats.pendingEquipment > 0,
    },
    {
      title: "Package Management",
      description: "Monitor all packages and deliveries",
      icon: "📦",
      href: "/admin/packages",
      color: "bg-green-50 text-green-600",
      count: stats.totalPackages,
    },
    {
      title: "Route Management",
      description: "View and manage all routes",
      icon: "🗺️",
      href: "/admin/routes",
      color: "bg-purple-50 text-purple-600",
      count: stats.totalRoutes,
    },
    {
      title: "Feature Flags",
      description: "Control platform feature availability",
      icon: "🚩",
      href: "/admin/feature-flags",
      color: "bg-pink-50 text-pink-600",
      count: 0,
    },
    {
      title: "Analytics",
      description: "Revenue and growth insights",
      icon: "📊",
      href: "/admin/analytics",
      color: "bg-indigo-50 text-indigo-600",
      count: 0,
    },
  ];

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
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-purple-100 text-sm">{currentUser?.email}</p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
              👨‍💼
            </div>
          </div>

          {/* Quick Stats in Header */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
              <p className="text-sm text-purple-100">Total Users</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-3xl font-bold">{stats.totalPackages}</p>
              <p className="text-sm text-purple-100">Packages</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 -mt-8 space-y-6">
        {/* Pending Actions Alert */}
        {stats.pendingRunners > 0 && (
          <Card
            variant="elevated"
            className="bg-orange-50 border-orange-200 animate-fade-in"
          >
            <div className="flex items-start gap-4 p-4">
              <div className="text-4xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-bold text-orange-800 mb-1">
                  Pending Approvals
                </h3>
                <p className="text-sm text-orange-700 mb-3">
                  {stats.pendingRunners} runner application
                  {stats.pendingRunners !== 1 ? "s" : ""} waiting for review
                </p>
                <Link
                  href="/admin/runners"
                  className="inline-block bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors"
                >
                  Review Now →
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Total Routes"
            value={stats.totalRoutes}
            icon="🗺️"
            variant="purple"
          />
          <StatCard
            title="Equipment Pending"
            value={stats.pendingEquipment}
            icon="🔧"
            variant="warning"
          />
        </div>

        {/* Management Cards */}
        <Card variant="elevated" className="animate-slide-up">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {managementItems.map((item) => (
                <Link key={item.href} href={item.href} className="block">
                  <div
                    className={`${item.color} rounded-2xl p-4 hover:scale-[1.02] transition-transform`}
                  >
                    <div className="text-3xl mb-2">{item.icon}</div>
                    <p className="font-bold text-sm mb-1">{item.title}</p>
                    <p className="text-2xl font-bold mb-1">{item.count}</p>
                    {item.badge && (
                      <span className="inline-block bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        Action Needed
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Overview */}
        <Card variant="elevated" className="animate-slide-up">
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl">
                    👥
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Users</p>
                    <p className="text-sm text-gray-500">
                      Total registered users
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalUsers}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">
                    📦
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Packages</p>
                    <p className="text-sm text-gray-500">
                      All packages in system
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.totalPackages}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-xl">
                    🗺️
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Routes</p>
                    <p className="text-sm text-gray-500">
                      Active delivery routes
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.totalRoutes}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
    </div>
  );
}
