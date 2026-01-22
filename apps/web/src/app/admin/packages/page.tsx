"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSafe } from "@/lib/firebase/auth";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

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

  const handleAddNote = async (packageId: string) => {
    const note = prompt("Add an internal note");
    if (!note) return;
    try {
      await updateDoc(doc(db, "packages", packageId), {
        internalNotes: arrayUnion({
          note,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.uid || "admin",
        }),
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      alert(`Failed to add note: ${error.message}`);
    }
  };

  const handleReportIssue = async (
    packageId: string,
    issueStatus: "lost" | "damaged",
  ) => {
    if (!confirm(`Mark package as ${issueStatus}?`)) return;
    await updateDoc(doc(db, "packages", packageId), {
      issueStatus,
      issueReportedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
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
      const packagesQuery = query(
        collection(db, "packages"),
        orderBy("createdAt", "desc"),
      );

      const unsubscribe = onSnapshot(
        packagesQuery,
        (snapshot) => {
          const packagesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setPackages(packagesData);
          setLoading(false);
        },
        (error) => {
          console.error("Error loading packages:", error);
          setLoading(false);
        },
      );

      return () => unsubscribe();
    }
  }, [currentUser]);

  const filteredPackages = packages.filter((pkg) => {
    if (filter === "all") return true;
    return pkg.currentStatus === filter;
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
                <h1 className="text-2xl font-bold">Package Management</h1>
                <p className="text-purple-100 text-sm">
                  {packages.length} total packages
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
            { label: "Payment Pending", value: "payment_pending" },
            { label: "Pickup Pending", value: "pickup_pending" },
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
                <p className="text-gray-600 text-lg">No packages found</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredPackages.map((pkg) => (
            <Card
              key={pkg.id}
              variant="elevated"
              className="hover-lift animate-fade-in"
            >
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">📦</span>
                      <div>
                        <div className="font-bold text-lg">
                          {pkg.trackingNumber}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {pkg.userId?.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="text-gray-500 min-w-[60px]">
                          From:
                        </span>
                        <span className="font-medium">
                          {pkg.origin?.address || "Unknown"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-500 min-w-[60px]">To:</span>
                        <span className="font-medium">
                          {pkg.destination?.address || "Unknown"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-500 min-w-[60px]">
                          Weight:
                        </span>
                        <span>
                          {pkg.weight} lbs • {pkg.dimensions?.length}×
                          {pkg.dimensions?.width}×{pkg.dimensions?.height} in
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <StatusBadge status={pkg.currentStatus} />

                    {pkg.issueStatus && (
                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                        {pkg.issueStatus.toUpperCase()}
                      </span>
                    )}

                    <select
                      value={pkg.currentStatus || ""}
                      onChange={(e) =>
                        handleStatusChange(pkg.id, e.target.value)
                      }
                      disabled={updating === pkg.id}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white hover:border-purple-300 transition-all disabled:opacity-50 cursor-pointer"
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
                      className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                    >
                      Track Package →
                    </Link>

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => handleAddNote(pkg.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                      >
                        Add Note
                      </button>
                      <button
                        onClick={() => handleReportIssue(pkg.id, "lost")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition"
                      >
                        Mark Lost
                      </button>
                      <button
                        onClick={() => handleReportIssue(pkg.id, "damaged")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition"
                      >
                        Mark Damaged
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
