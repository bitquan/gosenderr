"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSafe } from "@/lib/firebase/auth";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { BottomNav, customerNavItems } from "@/components/ui/BottomNav";
import { FloatingButton } from "@/components/ui/FloatingButton";

export default function CustomerPackagesNew() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

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
      loadPackages();
    }
  }, [currentUser]);

  const loadPackages = async () => {
    try {
      const packagesQuery = query(
        collection(db, "packages"),
        where("senderId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
      );
      const packagesSnap = await getDocs(packagesQuery);
      const packagesData = packagesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPackages(packagesData);
    } catch (error) {
      console.error("Error loading packages:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPackages = packages.filter((pkg) => {
    if (filter === "all") return true;
    return pkg.currentStatus === filter;
  });

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { badge: any; color: string }> = {
      payment_pending: { badge: "pending", color: "bg-yellow-50" },
      pickup_pending: { badge: "pending", color: "bg-blue-50" },
      in_transit: { badge: "in_progress", color: "bg-purple-50" },
      delivered: { badge: "completed", color: "bg-green-50" },
    };
    return statusMap[status] || { badge: "pending", color: "bg-gray-50" };
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
              <h1 className="text-2xl font-bold">My Packages</h1>
              <p className="text-purple-100 text-sm">
                {packages.length} total shipments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-4xl mx-auto px-6 -mt-4 mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 overflow-x-auto">
          {[
            { label: "All", value: "all" },
            { label: "Pending", value: "payment_pending" },
            { label: "Pickup", value: "pickup_pending" },
            { label: "In Transit", value: "in_transit" },
            { label: "Delivered", value: "delivered" },
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

      {/* Packages List */}
      <div className="max-w-4xl mx-auto px-6 space-y-4">
        {filteredPackages.length === 0 ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <p className="text-gray-600 text-lg mb-4">
                  {filter === "all"
                    ? "No packages yet"
                    : `No ${filter.replace("_", " ")} packages`}
                </p>
                <Link
                  href="/customer/request-delivery"
                  className="inline-block bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
                >
                  Ship Your First Package
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredPackages.map((pkg: any) => {
            const statusInfo = getStatusInfo(pkg.currentStatus);
            return (
              <Link key={pkg.id} href={`/customer/packages/${pkg.id}`}>
                <Card
                  variant="elevated"
                  hover
                  className={`${statusInfo.color} animate-fade-in`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl shadow-sm">
                            📦
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">
                              {pkg.recipientName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {pkg.recipientAddress?.city},{" "}
                              {pkg.recipientAddress?.state}
                            </p>
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={statusInfo.badge} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3 p-3 bg-white/50 rounded-xl">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Package ID</p>
                        <p className="font-mono text-sm font-medium">
                          {pkg.id.slice(0, 8)}...
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Created</p>
                        <p className="text-sm font-medium">
                          {pkg.createdAt?.toDate?.().toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {pkg.weight} lbs • {pkg.dimensions?.length}×
                        {pkg.dimensions?.width}×{pkg.dimensions?.height} in
                      </span>
                      <span className="text-purple-600 font-medium">
                        View Details →
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      <BottomNav items={customerNavItems} />
      <FloatingButton
        icon="➕"
        onClick={() => router.push("/customer/request-delivery")}
        variant="primary"
      />
    </div>
  );
}
