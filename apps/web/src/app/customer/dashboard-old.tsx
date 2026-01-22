"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSafe } from "@/lib/firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { BottomNav, customerNavItems } from "@/components/ui/BottomNav";
import { FloatingButton } from "@/components/ui/FloatingButton";

export default function CustomerDashboardNew() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      router.push("/login");
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser]);

  const loadDashboardData = async () => {
    try {
      const packagesQuery = query(
        collection(db, "packages"),
        where("senderId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(5),
      );

      const unsubscribePackages = onSnapshot(packagesQuery, (snapshot) => {
        const packagesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPackages(packagesData);
        updateActivities(packagesData, jobs);
      });

      const jobsQuery = query(
        collection(db, "jobs"),
        where("customerId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(5),
      );

      const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
        const jobsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setJobs(jobsData);
        updateActivities(packages, jobsData);
      });

      setLoading(false);

      return () => {
        unsubscribePackages();
        unsubscribeJobs();
      };
    } catch (error) {
      console.error("Error loading dashboard:", error);
      setLoading(false);
    }
  };

  const updateActivities = (pkgs: any[], jbs: any[]) => {
    const allActivities: any[] = [];

    pkgs.forEach((pkg) => {
      allActivities.push({
        id: pkg.id,
        type: "package",
        title: `Package to ${pkg.recipientName}`,
        description: `${pkg.status}`,
        status: pkg.status,
        timestamp: pkg.createdAt,
        icon: "📦",
      });
    });

    jbs.forEach((job) => {
      allActivities.push({
        id: job.id,
        type: "job",
        title: job.restaurantName || "Food Delivery",
        description: job.status,
        status: job.status,
        timestamp: job.createdAt,
        icon: "🍔",
      });
    });

    allActivities.sort((a, b) => {
      const aTime = a.timestamp?.toMillis?.() || 0;
      const bTime = b.timestamp?.toMillis?.() || 0;
      return bTime - aTime;
    });

    setActivities(allActivities.slice(0, 10));
  };

  const getStats = () => {
    const totalPackages = packages.length;
    const activePackages = packages.filter(
      (p) => p.status === "in_transit" || p.status === "pickup_pending",
    ).length;
    const deliveredPackages = packages.filter(
      (p) => p.status === "delivered",
    ).length;
    const totalJobs = jobs.length;

    return {
      totalPackages,
      activePackages,
      deliveredPackages,
      totalJobs,
    };
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

  const stats = getStats();

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar
                fallback={currentUser?.displayName || currentUser?.email}
                size="lg"
              />
              <div>
                <h1 className="text-2xl font-bold">
                  {currentUser?.displayName || "Welcome"}
                </h1>
                <p className="text-purple-100 text-sm">{currentUser?.email}</p>
              </div>
            </div>
            <Link href="/customer/profile">
              <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                ⚙️
              </button>
            </Link>
          </div>

          {/* Quick Stats in Header */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-3xl font-bold">{stats.totalPackages}</p>
              <p className="text-sm text-purple-100">Total Packages</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-3xl font-bold">{stats.activePackages}</p>
              <p className="text-sm text-purple-100">In Transit</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Delivered"
            value={stats.deliveredPackages}
            icon="✅"
            variant="success"
          />
          <StatCard
            title="Food Orders"
            value={stats.totalJobs}
            icon="🍔"
            variant="warning"
          />
        </div>

        {/* Recent Packages */}
        <Card variant="elevated" className="animate-slide-up">
          <CardHeader
            action={
              <Link
                href="/customer/packages"
                className="text-purple-600 text-sm font-medium"
              >
                View All →
              </Link>
            }
          >
            <CardTitle>Recent Packages</CardTitle>
          </CardHeader>
          <CardContent>
            {packages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-5xl mb-3">📦</div>
                <p className="mb-2">No packages yet</p>
                <Link
                  href="/customer/ship"
                  className="text-purple-600 text-sm font-medium"
                >
                  Ship your first package →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {packages.slice(0, 3).map((pkg: any) => (
                  <Link
                    key={pkg.id}
                    href={`/customer/packages/${pkg.id}`}
                    className="block"
                  >
                    <div className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            To: {pkg.recipientName}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {pkg.recipientAddress?.street}
                          </p>
                        </div>
                        <StatusBadge
                          status={
                            pkg.status === "delivered"
                              ? "completed"
                              : pkg.status === "in_transit"
                                ? "in_progress"
                                : "pending"
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {pkg.createdAt?.toDate?.().toLocaleDateString()}
                        </span>
                        <span className="text-gray-400">
                          ID: {pkg.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Timeline */}
        <Card variant="elevated" className="animate-slide-up">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-xl">
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.timestamp
                          ?.toDate?.()
                          .toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNav items={customerNavItems} />

      {/* Floating Action Button */}
      <FloatingButton
        icon="➕"
        onClick={() => router.push("/customer/ship")}
        variant="primary"
      />
    </div>
  );
}
