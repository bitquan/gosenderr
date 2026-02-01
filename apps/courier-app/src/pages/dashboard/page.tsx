import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { LoadingState } from "@gosenderr/ui";

import { db } from "@/lib/firebase";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useUserDoc } from "@/hooks/v2/useUserDoc";
import { useOpenJobs } from "@/hooks/v2/useOpenJobs";
import { claimJob } from "@/lib/v2/jobs";
import { CourierJobPreview } from "@/components/v2/CourierJobPreview";
import type { Job } from "@/lib/v2/types";

export default function CourierDashboardMobile() {
  const navigate = useNavigate();
  const { uid, loading: authLoading } = useAuthUser();
  const { userDoc, loading: userLoading } = useUserDoc();
  const { jobs, loading: jobsLoading } = useOpenJobs();
  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);
  const [togglingOnline, setTogglingOnline] = useState(false);

  const courierLocation = userDoc?.courierProfile?.currentLocation || null;
  const transportMode = userDoc?.courierProfile?.vehicleType || "car";
  const courierStatus = (userDoc?.courierProfile as any)?.status || "none";
  const isApproved = courierStatus === "approved";
  const rejectionReason = (userDoc?.courierProfile as any)?.rejectionReason || null;

  const activeJobs = useMemo(() => {
    return jobs.filter(
      (job) =>
        job.courierUid === uid &&
        !["completed", "cancelled"].includes(job.status),
    );
  }, [jobs, uid]);

  const openJobs = useMemo(() => {
    return jobs.filter((job) => job.status === "open");
  }, [jobs]);

  const hasRateCards = Boolean(
    userDoc?.courierProfile?.packageRateCard ||
      userDoc?.courierProfile?.foodRateCard,
  );

  const getRateCardForJob = (job: Job) => {
    const isFoodJob = Boolean(
      (job as any).isFoodItem ||
        (job as any).foodDetails ||
        (job as any).foodTemperature,
    );
    return isFoodJob
      ? userDoc?.courierProfile?.foodRateCard
      : userDoc?.courierProfile?.packageRateCard;
  };

  const handleAccept = async (jobId: string, fee: number) => {
    if (!uid) return;
    try {
      await claimJob(jobId, uid, fee);
      navigate(`/jobs/${jobId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to accept job";
      alert(message);
    } finally {
      setAcceptingJobId(null);
    }
  };

  const handleToggleOnline = async () => {
    if (!uid || !userDoc || togglingOnline) return;
    setTogglingOnline(true);
    try {
      const isOnline = Boolean(userDoc.courierProfile?.isOnline);
      await updateDoc(doc(db, "users", uid), {
        "courierProfile.isOnline": !isOnline,
      });
    } catch (error) {
      console.error("Failed to toggle online status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setTogglingOnline(false);
    }
  };

  if (authLoading || userLoading || jobsLoading) {
    return <LoadingState fullPage message="Loading courier jobs..." />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Available Jobs</h1>
            <p className="text-sm text-gray-600">
              Pick a job that fits your route and equipment.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleOnline}
              disabled={togglingOnline || !isApproved}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                userDoc?.courierProfile?.isOnline
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              } ${togglingOnline || !isApproved ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {userDoc?.courierProfile?.isOnline ? "🟢 Online" : "⚪ Offline"}
            </button>
            <Link
              to="/rate-cards"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50"
            >
              Edit Rates
            </Link>
          </div>
        </div>

        {!hasRateCards && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900">
            <p className="font-semibold">Set your rates to accept jobs.</p>
            <p className="text-sm">Couriers control their own pricing.</p>
            <div className="mt-3">
              <Link
                to="/rate-cards"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700"
              >
                Set Rate Card
              </Link>
            </div>
          </div>
        )}

        {!isApproved && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-yellow-900">
            {courierStatus === "pending" && (
              <p className="font-semibold">⏳ Your courier application is under review.</p>
            )}
            {courierStatus === "rejected" && (
              <div>
                <p className="font-semibold">❌ Your courier application was rejected.</p>
                {rejectionReason && <p className="text-sm mt-1">Reason: {rejectionReason}</p>}
              </div>
            )}
            {courierStatus === "none" && (
              <p className="font-semibold">Complete onboarding to start accepting jobs.</p>
            )}
            <div className="mt-3">
              <Link
                to="/onboarding"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-yellow-600 text-white text-sm font-semibold hover:bg-yellow-700"
              >
                Start Onboarding
              </Link>
            </div>
          </div>
        )}

        {activeJobs.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">Active Jobs</h2>
            {activeJobs.map((job) => (
              <CourierJobPreview
                key={job.id}
                job={job}
                rateCard={getRateCardForJob(job)}
                courierLocation={courierLocation}
                transportMode={transportMode}
                viewerUid={uid || undefined}
                enableRoute={true}
                showAcceptButton={false}
                footer={
                  <button
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                  >
                    Continue Job
                  </button>
                }
              />
            ))}
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">Open Jobs</h2>
          {openJobs.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-600">
              No open jobs right now. Check back soon.
            </div>
          ) : (
            <div className="space-y-4">
              {openJobs.map((job) => (
                <CourierJobPreview
                  key={job.id}
                  job={job}
                  rateCard={getRateCardForJob(job)}
                  courierLocation={courierLocation}
                  transportMode={transportMode}
                  viewerUid={uid || undefined}
                  onAccept={isApproved ? handleAccept : undefined}
                  loading={acceptingJobId === job.id}
                  enableRoute={false}
                  showAcceptButton={isApproved}
                  footer={!isApproved ? (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-2">
                      Approval required before accepting jobs.
                    </div>
                  ) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
