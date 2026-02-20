
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useCustomerJobs } from "@/hooks/v2/useCustomerJobs";
import { getRoleDisplay } from "@gosenderr/shared";
import { JobSummaryCard } from "@/features/jobs/shared/JobSummaryCard";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { useState } from "react";

export default function CustomerJobs() {
  const navigate = useNavigate();
  const { uid } = useAuthUser();
  const { jobs, loading } = useCustomerJobs(uid || null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const handleReorder = async (job: any) => {
    if (!uid) return;

    setReorderingId(job.id);
    try {
      const pickupLat = job?.pickup?.lat;
      const pickupLng = job?.pickup?.lng;
      const dropoffLat = job?.dropoff?.lat;
      const dropoffLng = job?.dropoff?.lng;

      if (
        typeof pickupLat !== "number" ||
        typeof pickupLng !== "number" ||
        typeof dropoffLat !== "number" ||
        typeof dropoffLng !== "number"
      ) {
        throw new Error("This send is missing pickup/dropoff coordinates and cannot be reordered.");
      }

      const newJobRef = await addDoc(collection(db, "jobs"), {
        createdByUid: uid,
        status: "open",
        pickup: {
          lat: pickupLat,
          lng: pickupLng,
          label: job?.pickup?.label || "Pickup",
        },
        dropoff: {
          lat: dropoffLat,
          lng: dropoffLng,
          label: job?.dropoff?.label || "Dropoff",
        },
        package: job?.package || { size: "medium", flags: {} },
        photos: Array.isArray(job?.photos) ? job.photos : [],
        preferredCourierUid: null,
        offerCourierUid: null,
        offerQueue: [],
        offerStatus: "open",
        offerExpiresAt: null,
        pricing: job?.pricing || undefined,
        paymentStatus: "pending",
        paymentIntentId: null,
        courierUid: null,
        agreedFee: null,
        reorderedFromJobId: job.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      navigate(`/jobs/${newJobRef.id}`);
    } catch (error: any) {
      console.error("Failed to reorder send:", error);
      alert(error?.message || "Failed to reorder send. Please try again.");
    } finally {
      setReorderingId(null);
    }
  };

  if (loading) {
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
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar
                fallback={uid ? getRoleDisplay("customer").name : "Guest"}
                size="lg"
              />
              <div>
                <h1 className="text-2xl font-bold">My Sends</h1>
                <p className="text-purple-100 text-sm">
                  {jobs.length} active requests
                </p>
              </div>
            </div>
            <Link
              to="/jobs/new"
              className="inline-flex px-4 py-2 rounded-xl bg-white/20 text-white font-semibold hover:bg-white/30 transition"
            >
              + New Send
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8 space-y-6">
        {jobs.length === 0 ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <p className="text-gray-600 text-lg mb-4">No sends yet</p>
                <Link
                  to="/jobs/new"
                  className="inline-flex px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
                >
                  Create your first send
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Card
                key={job.id}
                variant="elevated"
                className="hover-lift animate-fade-in"
              >
                <CardHeader>
                  <CardTitle>Send #{job.id?.slice(0, 6)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <JobSummaryCard
                    job={job}
                    canSeeExactAddresses={true}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  />
                  <div className="mt-3 pt-3 border-t border-gray-100" onClick={(event) => event.stopPropagation()}>
                    <button
                      onClick={() => handleReorder(job)}
                      disabled={reorderingId === job.id}
                      className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {reorderingId === job.id ? "Reordering..." : "🔁 Reorder"}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
