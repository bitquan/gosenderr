
import { useParams, useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useJob } from "@/hooks/v2/useJob";
import { useUserDoc } from "@/hooks/v2/useUserDoc";
import { StatusTimeline } from "@/components/v2/StatusTimeline";
import { MapboxMap } from "@/components/v2/MapboxMap";
import { JobDetailsPanel } from "@/features/jobs/shared/JobDetailsPanel";
import { CourierJobActions } from "@/features/jobs/courier/CourierJobActions";
import { getJobVisibility } from "@/features/jobs/shared/privacy";
import { Job as FeatureJob } from "@/features/jobs/shared/types";
import { JobDoc } from "@/lib/v2/types";
import { Link } from "react-router-dom";
import { NotFoundPage } from "@/components/ui/NotFoundPage";
import { useNavigation } from "@/hooks/useNavigation";

// Convert JobDoc to features Job
function convertJobDocToJob(jobDoc: JobDoc, id: string): FeatureJob {
  return { ...jobDoc, id } as FeatureJob;
}

export default function CourierJobDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const jobId = params?.jobId as string;
  const { uid } = useAuthUser();
  const { job: jobDoc, loading: jobLoading } = useJob(jobId);
  const { userDoc } = useUserDoc();
  const { startNavigation, isNavigating } = useNavigation();
  const courierLocation = userDoc?.courierProfile?.currentLocation ?? null;
  const hasLocation = Boolean(courierLocation);

  if (jobLoading) {
    return (
      <div style={{ padding: "30px" }}>
        <p>Loading job...</p>
      </div>
    );
  }

  if (!jobDoc || !uid) {
    return (
      <NotFoundPage
        title="Job not found"
        description="We couldn't locate that delivery job."
        actionHref="/dashboard"
        actionLabel="Back to Dashboard"
        emoji="🧾"
      />
    );
  }

  const job = convertJobDocToJob(jobDoc, jobId);

  if (job.courierUid !== uid) {
    return (
      <NotFoundPage
        title="Access denied"
        description="This job isn't assigned to your account."
        actionHref="/dashboard"
        actionLabel="Back to Dashboard"
        emoji="🔒"
      />
    );
  }

  const visibility = getJobVisibility(job, { uid, role: "courier" });
  const isPaymentLocked = job.paymentStatus !== "authorized";
  const canNavigateToPickup = ["assigned", "enroute_pickup", "arrived_pickup"].includes(
    job.status,
  );
  const canNavigateToDropoff = [
    "picked_up",
    "enroute_dropoff",
    "arrived_dropoff",
  ].includes(job.status);
  
  const handleStartNavigation = async (destination: "pickup" | "dropoff") => {
    if (!courierLocation) {
      alert(
        "Unable to get your current location. Please enable location services.",
      );
      return;
    }

    const targetLocation = destination === "pickup" ? job.pickup : job.dropoff;
    await startNavigation(job, courierLocation, targetLocation);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] p-6 text-white shadow-lg sticky top-0 z-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-white/90 hover:text-white mb-3 transition-colors text-sm"
        >
          <span className="mr-2">←</span>
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Active Delivery</h1>
        <p className="text-purple-100 text-sm mt-1">
          Accepted: {job.updatedAt?.toDate?.()?.toLocaleString() || "Just now"}
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {isPaymentLocked && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4">
            <p className="font-semibold">Awaiting customer payment</p>
            <p className="text-sm">You can view details, but trip actions are locked until payment is authorized.</p>
          </div>
        )}
        {/* Next Action */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Next action</h2>
          <p className="text-sm text-gray-600 mb-4">
            Follow the step-by-step flow to keep the delivery on track.
          </p>
          <CourierJobActions
            job={job}
            courierUid={uid}
            onJobUpdated={() => {
              if (job.status === "arrived_dropoff") {
                setTimeout(() => navigate("/dashboard"), 1000);
              }
            }}
          />
        </div>
        {/* Status Timeline */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Progress</h2>
          <StatusTimeline currentStatus={job.status} isPaymentLocked={isPaymentLocked} />
        </div>

        {/* Live Map */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Live Map</h3>
          </div>
          <MapboxMap
            pickup={job.pickup}
            dropoff={job.dropoff}
            courierLocation={courierLocation}
            height="300px"
          />
        </div>

        {/* Job Details Panel with Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <JobDetailsPanel job={job} visibility={visibility} showStatus={true} />
        </div>

        {/* Navigation Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleStartNavigation("pickup")}
            disabled={
              isNavigating ||
              !hasLocation ||
              isPaymentLocked ||
              !canNavigateToPickup
            }
            className={`py-4 px-4 rounded-xl font-semibold text-white shadow-lg transition-all ${
              isNavigating ||
              !userDoc?.location ||
              isPaymentLocked ||
              !canNavigateToPickup
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] hover:shadow-xl active:scale-95"
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">📍</div>
              <div className="text-sm">
                {isNavigating ? "Navigating..." : "Navigate to Pickup"}
              </div>
            </div>
          </button>
          <button
            onClick={() => handleStartNavigation("dropoff")}
            disabled={
              isNavigating ||
              !hasLocation ||
              isPaymentLocked ||
              !canNavigateToDropoff
            }
            className={`py-4 px-4 rounded-xl font-semibold text-white shadow-lg transition-all ${
              isNavigating ||
              !userDoc?.location ||
              isPaymentLocked ||
              !canNavigateToDropoff
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-br from-emerald-500 to-emerald-600 hover:shadow-xl active:scale-95"
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">🎯</div>
              <div className="text-sm">
                {isNavigating ? "Navigating..." : "Navigate to Dropoff"}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
