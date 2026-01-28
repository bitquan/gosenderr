
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { ProofOfDeliveryModal } from "@/components/v2/ProofOfDeliveryModal";

interface Job {
  id: string;
  status: string;
  pickupAddress: any;
  dropoffAddress: any;
  packageDetails: any;
  pricing: any;
  customerName: string;
  estimatedDuration: string;
  distance: number;
  createdAt: any;
  acceptedAt?: any;
  pickedUpAt?: any;
  deliveredAt?: any;
}

export default function RunnerJobsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobForProof, setSelectedJobForProof] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      navigate("/login");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/login");
      } else {
        setCurrentUserId(user.uid);
        loadJobs(user.uid);
      }
    });

    return () => unsubscribe();
  }, [navigate, activeTab]);

  const loadJobs = async (userId: string) => {
    setLoading(true);
    try {
      let jobsQuery;

      if (activeTab === "active") {
        jobsQuery = query(
          collection(db, "jobs"),
          where("runnerId", "==", userId),
          where("status", "in", ["accepted", "picked_up", "in_progress"]),
          orderBy("createdAt", "desc"),
        );
      } else {
        jobsQuery = query(
          collection(db, "jobs"),
          where("runnerId", "==", userId),
          where("status", "in", ["delivered", "completed"]),
          orderBy("createdAt", "desc"),
        );
      }

      const snapshot = await getDocs(jobsQuery);
      const jobsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Job[];

      setJobs(jobsData);
    } catch (error) {
      console.error("Error loading jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProofSubmitted = () => {
    if (currentUserId) {
      loadJobs(currentUserId);
    }
    setSelectedJobForProof(null);
  };

  if (loading) {
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

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My Jobs</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === "active"
                ? "bg-purple-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Active Jobs
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === "completed"
                ? "bg-purple-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Completed
          </button>
        </div>

        {/* Jobs List */}
        {jobs.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">
                {activeTab === "active" ? "📦" : "✅"}
              </div>
              <p className="text-gray-500 text-lg mb-2">
                {activeTab === "active"
                  ? "No active jobs"
                  : "No completed jobs yet"}
              </p>
              {activeTab === "active" && (
                <a
                  href="/runner/available-routes"
                  className="text-purple-600 text-sm font-medium hover:underline"
                >
                  Browse available jobs →
                </a>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} variant="elevated">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          Delivery to {job.customerName || "Customer"}
                        </h3>
                        <StatusBadge status={job.status as any} />
                      </div>
                      <p className="text-sm text-gray-500">Job #{job.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        ${job.pricing?.runnerEarnings?.toFixed(2) || "0.00"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {job.distance} miles
                      </p>
                    </div>
                  </div>

                  {/* Route */}
                  <div className="space-y-3 mb-4">
                    {/* Pickup */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">📍</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-blue-800 mb-1">
                          PICKUP
                        </p>
                        <p className="font-medium text-gray-900">
                          {job.pickupAddress?.street || "Address not available"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {job.pickupAddress?.city}, {job.pickupAddress?.state}{" "}
                          {job.pickupAddress?.zipCode}
                        </p>
                      </div>
                    </div>

                    {/* Dropoff */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">🎯</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-green-800 mb-1">
                          DROPOFF
                        </p>
                        <p className="font-medium text-gray-900">
                          {job.dropoffAddress?.street || "Address not available"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {job.dropoffAddress?.city}, {job.dropoffAddress?.state}{" "}
                          {job.dropoffAddress?.zipCode}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Package Details */}
                  <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Size</p>
                      <p className="font-semibold text-gray-900 capitalize">
                        {job.packageDetails?.size || "Standard"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Weight</p>
                      <p className="font-semibold text-gray-900">
                        {job.packageDetails?.weight || "N/A"} lbs
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Est. Time</p>
                      <p className="font-semibold text-gray-900">
                        {job.estimatedDuration || "30 min"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Distance</p>
                      <p className="font-semibold text-gray-900">
                        {job.distance} mi
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {activeTab === "active" && (
                    <div className="flex gap-3">
                      {job.status === "accepted" && (
                        <button className="flex-1 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
                          📍 Start Pickup
                        </button>
                      )}
                      {job.status === "picked_up" && (
                        <button
                          onClick={() => setSelectedJobForProof(job.id)}
                          className="flex-1 px-6 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition"
                        >
                          ✓ Complete Delivery
                        </button>
                      )}
                      <button className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition">
                        📞 Contact Customer
                      </button>
                    </div>
                  )}

                  {activeTab === "completed" && job.deliveredAt && (
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-500">
                        Completed on{" "}
                        {job.deliveredAt?.toDate?.().toLocaleDateString()}
                      </p>
                      {job.pricing?.tip && (
                        <p className="text-sm font-semibold text-green-600">
                          + ${job.pricing.tip.toFixed(2)} tip
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Proof of Delivery Modal */}
      {selectedJobForProof && currentUserId && (
        <ProofOfDeliveryModal
          jobId={selectedJobForProof}
          runnerId={currentUserId}
          onClose={() => setSelectedJobForProof(null)}
          onComplete={handleProofSubmitted}
        />
      )}
    </div>
  );
}
