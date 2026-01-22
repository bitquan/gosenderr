"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSafe } from "@/lib/firebase/auth";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { BottomNav, adminNavItems } from "@/components/ui/BottomNav";
import { Avatar } from "@/components/ui/Avatar";

export default function AdminRunnersNew() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [runners, setRunners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "pending" | "approved" | "rejected" | "all"
  >("pending");
  const [processing, setProcessing] = useState<string | null>(null);

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
    if (!currentUser) return;

    const usersQuery = query(collection(db, "users"));

    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const runnersData = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((user: any) => user.packageRunnerProfile);

        setRunners(runnersData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading runners:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleApprove = async (runnerId: string) => {
    if (!confirm("Approve this runner application?")) return;

    setProcessing(runnerId);
    try {
      await updateDoc(doc(db, "users", runnerId), {
        "packageRunnerProfile.status": "approved",
        "packageRunnerProfile.approvedAt": serverTimestamp(),
        "packageRunnerProfile.approvedBy": currentUser.uid,
      });
      alert("✅ Runner approved!");
    } catch (error: any) {
      console.error("Error approving runner:", error);
      alert(`Failed to approve: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (runnerId: string) => {
    const reason = prompt("Reason for rejection (optional):");
    if (reason === null) return;

    setProcessing(runnerId);
    try {
      await updateDoc(doc(db, "users", runnerId), {
        "packageRunnerProfile.status": "rejected",
        "packageRunnerProfile.rejectedAt": serverTimestamp(),
        "packageRunnerProfile.rejectedBy": currentUser.uid,
        "packageRunnerProfile.rejectionReason": reason || "Not specified",
      });
      alert("Runner application rejected");
    } catch (error: any) {
      console.error("Error rejecting runner:", error);
      alert(`Failed to reject: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const filteredRunners = runners.filter((runner) => {
    if (filter === "all") return true;
    return runner.packageRunnerProfile?.status === `${filter}_review`;
  });

  const getStatusBadge = (
    status?: string,
  ): "pending" | "approved" | "rejected" => {
    const statusMap: Record<string, "pending" | "approved" | "rejected"> = {
      pending_review: "pending",
      approved: "approved",
      rejected: "rejected",
    };
    return statusMap[status || "pending_review"] || "pending";
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
              <h1 className="text-2xl font-bold">Runner Applications</h1>
              <p className="text-purple-100 text-sm">
                {filteredRunners.length} applications
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-4xl mx-auto px-6 -mt-4 mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2">
          {[
            { label: "Pending", value: "pending" },
            { label: "Approved", value: "approved" },
            { label: "Rejected", value: "rejected" },
            { label: "All", value: "all" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as any)}
              className={`flex-1 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
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

      {/* Runners List */}
      <div className="max-w-4xl mx-auto px-6 space-y-4">
        {filteredRunners.length === 0 ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🚚</div>
                <p className="text-gray-600 text-lg">
                  No {filter !== "all" ? filter : ""} applications
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredRunners.map((runner: any) => {
            const profile = runner.packageRunnerProfile;
            return (
              <Card
                key={runner.id}
                variant="elevated"
                className="animate-fade-in"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar
                      fallback={runner.displayName || runner.email}
                      size="lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-bold text-gray-900 text-lg">
                            {runner.displayName || "No name"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {runner.email}
                          </p>
                        </div>
                        <StatusBadge status={getStatusBadge(profile?.status)} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Phone</p>
                      <p className="font-medium">{profile?.phone || "N/A"}</p>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Home Hub</p>
                      <p className="font-medium">
                        {profile?.homeHub?.name || "Not set"}
                      </p>
                    </div>

                    {profile?.vehicle && (
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Vehicle</p>
                        <p className="font-medium">
                          {profile.vehicle.year} {profile.vehicle.make}{" "}
                          {profile.vehicle.model}
                        </p>
                        <p className="text-sm text-gray-600">
                          {profile.vehicle.licensePlate}
                        </p>
                      </div>
                    )}

                    {profile?.equipment && profile.equipment.length > 0 && (
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-2">Equipment</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.equipment.map(
                            (item: string, idx: number) => (
                              <Badge key={idx} variant="purple">
                                {item}
                              </Badge>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {profile?.driverLicenseInfo && (
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">
                          Driver License
                        </p>
                        <p className="font-medium">
                          {profile.driverLicenseInfo.number}
                        </p>
                        <p className="text-sm text-gray-600">
                          Exp: {profile.driverLicenseInfo.expiryDate}
                        </p>
                      </div>
                    )}
                  </div>

                  {profile?.status === "pending_review" && (
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleApprove(runner.id)}
                        disabled={processing === runner.id}
                        className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleReject(runner.id)}
                        disabled={processing === runner.id}
                        className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 transition-colors disabled:bg-gray-400"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}

                  {profile?.status === "approved" && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        Approved on{" "}
                        {profile.approvedAt?.toDate?.().toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {profile?.status === "rejected" &&
                    profile.rejectionReason && (
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-sm text-red-600 mb-1">
                          Rejection reason:
                        </p>
                        <p className="text-sm text-gray-700">
                          {profile.rejectionReason}
                        </p>
                      </div>
                    )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      <BottomNav items={adminNavItems} />
    </div>
  );
}
