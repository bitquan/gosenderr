"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";

interface Dispute {
  id: string;
  jobId: string;
  reason: string;
  description: string;
  status: "open" | "reviewing" | "resolved";
  type: string;
  createdAt: any;
  updatedAt: any;
  resolution?: string;
  resolutionNotes?: string;
}

export default function DisputesPage() {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loadingDisputes, setLoadingDisputes] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "disputes"),
      where("customerUid", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const disputeData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Dispute[];
        setDisputes(disputeData);
        setLoadingDisputes(false);
      },
      (error) => {
        console.error("Error fetching disputes:", error);
        setLoadingDisputes(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const filteredDisputes =
    statusFilter === "all"
      ? disputes
      : disputes.filter((d) => d.status === statusFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-700";
      case "reviewing":
        return "bg-yellow-100 text-yellow-700";
      case "resolved":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "—";
    const date =
      timestamp.toDate?.() || new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Disputes</h1>
            <p className="text-sm text-gray-600 mt-1">
              Track your dispute cases and resolutions
            </p>
          </div>
          <Link
            href="/customer/dashboard"
            className="text-sm font-semibold text-purple-600 hover:text-purple-700"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Filter Tabs */}
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex gap-2 overflow-x-auto">
              {[
                { label: "All", value: "all" },
                { label: "Open", value: "open" },
                { label: "Under Review", value: "reviewing" },
                { label: "Resolved", value: "resolved" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    statusFilter === filter.value
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {filter.label}
                  {filter.value !== "all" && (
                    <span className="ml-2">
                      (
                      {
                        disputes.filter((d) => d.status === filter.value)
                          .length
                      }
                      )
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Disputes List */}
        {loadingDisputes ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Loading disputes...
              </div>
            </CardContent>
          </Card>
        ) : filteredDisputes.length === 0 ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🚨</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {statusFilter === "all"
                    ? "No disputes filed"
                    : `No ${statusFilter} disputes`}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {statusFilter === "all"
                    ? "If you have an issue with a delivery, you can file a dispute from the job details page."
                    : "Try selecting a different filter to see more disputes."}
                </p>
                {statusFilter === "all" && (
                  <Link
                    href="/customer/jobs"
                    className="inline-flex px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
                  >
                    View My Jobs
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDisputes.map((dispute) => (
              <Card key={dispute.id} variant="elevated">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {dispute.reason}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded capitalize ${getStatusColor(
                            dispute.status
                          )}`}
                        >
                          {dispute.status === "reviewing"
                            ? "Under Review"
                            : dispute.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        Job ID:{" "}
                        <Link
                          href={`/customer/jobs/${dispute.jobId}`}
                          className="font-mono text-purple-600 hover:text-purple-700"
                        >
                          {dispute.jobId.slice(0, 8)}
                        </Link>
                      </div>
                      <div className="text-xs text-gray-500">
                        Filed {formatDate(dispute.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-700">
                      {dispute.description}
                    </p>
                  </div>

                  {/* Resolution (if resolved) */}
                  {dispute.status === "resolved" && dispute.resolution && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">✅</span>
                        <h4 className="font-semibold text-green-900 text-sm">
                          Resolution: {dispute.resolution}
                        </h4>
                      </div>
                      {dispute.resolutionNotes && (
                        <p className="text-sm text-green-700 ml-7">
                          {dispute.resolutionNotes}
                        </p>
                      )}
                      <p className="text-xs text-green-600 ml-7 mt-1">
                        Resolved {formatDate(dispute.updatedAt)}
                      </p>
                    </div>
                  )}

                  {/* Under Review Message */}
                  {dispute.status === "reviewing" && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⏳</span>
                        <p className="text-sm text-yellow-700">
                          Our team is reviewing your case. We'll contact you
                          within 24-48 hours with an update.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Open Status Message */}
                  {dispute.status === "open" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📋</span>
                        <p className="text-sm text-blue-700">
                          Your dispute has been received and will be reviewed
                          shortly.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
