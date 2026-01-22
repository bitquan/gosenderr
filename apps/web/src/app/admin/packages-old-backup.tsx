"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSafe } from "@/lib/firebase/auth";
import {
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { GlassCard, LoadingSkeleton } from "@/components/GlassCard";
import Link from "next/link";

export default function AdminPackagesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const handleStatusChange = async (packageId: string, newStatus: string) => {
    if (!confirm(`Change package status to "${newStatus.replace(/_/g, " ")}"?`))
      return;
    setUpdating(packageId);
    try {
      await updateDoc(doc(db, "packages", packageId), {
        currentStatus: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      alert(`Failed to update package status: ${error.message}`);
    } finally {
      setUpdating(null);
    }
  };

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

      // Check Firestore role instead of custom claims
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
      loadPackages();
    }
  }, [currentUser]);

  const loadPackages = async () => {
    try {
      console.log("📦 [Admin Packages] Setting up real-time listener...");

      const packagesQuery = query(
        collection(db, "packages"),
        orderBy("createdAt", "desc"),
      );

      const unsubscribe = onSnapshot(
        packagesQuery,
        (snapshot) => {
          console.log("📦 [Real-time] Packages updated:", snapshot.size);
          const packagesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setPackages(packagesData);
          setLoading(false);
        },
        (error) => {
          console.error("❌ [Real-time] Packages listener error:", error);
          setLoading(false);
        },
      );

      return () => {
        console.log("🧹 [Admin Packages] Cleaning up listener");
        unsubscribe();
      };
    } catch (error) {
      console.error("Error setting up packages listener:", error);
      setLoading(false);
    }
  };

  const filteredPackages = packages.filter((pkg) => {
    if (filter === "all") return true;
    return pkg.currentStatus === filter;
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
        <h1 className="text-3xl font-bold mb-2">Package Management</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {packages.length} total packages
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { label: "All", value: "all" },
          { label: "Payment Pending", value: "payment_pending" },
          { label: "Pickup Pending", value: "pickup_pending" },
          { label: "In Transit", value: "in_transit" },
          { label: "Delivered", value: "delivered" },
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

      {/* Packages Grid */}
      <div className="grid gap-4">
        {filteredPackages.length === 0 ? (
          <GlassCard>
            <p className="text-center py-12 text-gray-500">No packages found</p>
          </GlassCard>
        ) : (
          filteredPackages.map((pkg) => (
            <GlassCard key={pkg.id}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">📦</span>
                    <div>
                      <div className="font-semibold">{pkg.trackingNumber}</div>
                      <div className="text-xs text-gray-500">
                        User ID: {pkg.userId}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">From:</span>{" "}
                      {pkg.origin?.address || "Unknown"}
                    </div>
                    <div>
                      <span className="text-gray-500">To:</span>{" "}
                      {pkg.destination?.address || "Unknown"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      pkg.currentStatus === "delivered"
                        ? "bg-green-100 text-green-800"
                        : pkg.currentStatus === "in_transit"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {pkg.currentStatus?.replace(/_/g, " ") || "Unknown"}
                  </span>

                  {/* Status Update Dropdown */}
                  <select
                    value={pkg.currentStatus || ""}
                    onChange={(e) => handleStatusChange(pkg.id, e.target.value)}
                    disabled={updating === pkg.id}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:opacity-50"
                  >
                    <option value="payment_pending">Payment Pending</option>
                    <option value="pickup_pending">Pickup Pending</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <div className="text-sm text-gray-500">
                    {pkg.createdAt?.toDate?.()?.toLocaleDateString() ||
                      "Unknown"}
                  </div>
                  <Link
                    href={`/track/package/${pkg.trackingNumber}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Track →
                  </Link>
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      <div className="text-sm text-gray-500">
        ✅ <strong>Status Updates:</strong> Use the dropdown to change package
        statuses. Changes are saved in real-time.
      </div>
    </div>
  );
}
