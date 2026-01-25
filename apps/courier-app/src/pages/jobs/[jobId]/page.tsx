
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
  
  const handleStartNavigation = async (destination: 'pickup' | 'dropoff') => {
    if (!userDoc?.location) {
      alert('Unable to get your current location. Please enable location services.');
      return;
    }

    const targetLocation = destination === 'pickup' ? job.pickup : job.dropoff;
    await startNavigation(job, userDoc.location, targetLocation);
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-y-auto pb-24 safe-top">
      <div style={{ padding: "16px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link
          to="/dashboard"
          style={{ color: "#6E56CF", textDecoration: "none" }}
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ margin: 0, marginBottom: "8px" }}>Active Job</h1>
        <div style={{ color: "#666", fontSize: "14px" }}>
          Accepted: {job.updatedAt?.toDate?.()?.toLocaleString() || "Just now"}
        </div>
      </div>

      {/* Status Timeline */}
      <div
        style={{
          marginBottom: "30px",
          padding: "20px",
          background: "white",
          borderRadius: "8px",
          border: "1px solid #ddd",
        }}
      >
        <StatusTimeline currentStatus={job.status} />
      </div>

      {/* Job Details Panel with Actions */}
      <div style={{ marginBottom: "30px" }}>
        <JobDetailsPanel job={job} visibility={visibility} showStatus={true}>
          <CourierJobActions
            job={job}
            courierUid={uid}
            onJobUpdated={() => {
              // Navigate back to dashboard after completing the job
              if (job.status === "arrived_dropoff") {
                setTimeout(() => navigate("/dashboard"), 1000);
              }
            }}
          />
        </JobDetailsPanel>
      </div>

      {/* Navigation Buttons */}
      <div style={{ marginBottom: "30px", display: "flex", gap: "12px" }}>
        <button
          onClick={() => handleStartNavigation('pickup')}
          disabled={isNavigating || !userDoc?.location}
          style={{
            flex: 1,
            padding: "12px",
            background: isNavigating || !userDoc?.location ? "#ccc" : "#6E56CF",
            color: "white",
            border: "none",
            borderRadius: "8px",
            textAlign: "center",
            fontWeight: "600",
            cursor: isNavigating || !userDoc?.location ? "not-allowed" : "pointer",
          }}
        >
          {isNavigating ? "Navigating..." : "Navigate to Pickup 🗺️"}
        </button>
        <button
          onClick={() => handleStartNavigation('dropoff')}
          disabled={isNavigating || !userDoc?.location}
          style={{
            flex: 1,
            padding: "12px",
            background: isNavigating || !userDoc?.location ? "#ccc" : "#16a34a",
            color: "white",
            border: "none",
            borderRadius: "8px",
            textAlign: "center",
            fontWeight: "600",
            cursor: isNavigating || !userDoc?.location ? "not-allowed" : "pointer",
          }}
        >
          {isNavigating ? "Navigating..." : "Navigate to Dropoff 🗺️"}
        </button>
      </div>

      <div>
        <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "12px" }}>Live Map</h3>
        <MapboxMap
          pickup={job.pickup}
          dropoff={job.dropoff}
          courierLocation={userDoc?.location || null}
          height="300px"
        />
      </div>
      </div>
    </div>
  );
}
