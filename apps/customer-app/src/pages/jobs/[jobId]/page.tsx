
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useJob } from "@/hooks/v2/useJob";
import { useCourierById } from "@/hooks/v2/useCourierById";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { StatusTimeline } from "@/components/v2/StatusTimeline";
import { MapboxMap } from "@/components/v2/MapboxMap";
import { JobDetailsPanel } from "@/features/jobs/shared/JobDetailsPanel";
import { CustomerJobActions } from "@/features/jobs/customer/CustomerJobActions";
import { getJobVisibility } from "@/features/jobs/shared/privacy";
import { Job as FeatureJob } from "@/features/jobs/shared/types";
import { JobDoc } from "@/lib/v2/types";
import { Link } from "react-router-dom";
import { NotFoundPage } from "@/components/ui/NotFoundPage";

// Convert JobDoc to features Job
function convertJobDocToJob(jobDoc: JobDoc, id: string): FeatureJob {
  return { ...jobDoc, id } as FeatureJob;
}

export default function CustomerJobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { uid } = useAuthUser();
  const { job: jobDoc, loading: jobLoading } = useJob(jobId || '');
  const { courier } = useCourierById(jobDoc?.courierUid || null);

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
        title="Send not found"
        description="We couldn't locate that send request."
        actionHref="/jobs"
        actionLabel="Back to My Sends"
        emoji="🧾"
      />
    );
  }

  const job = convertJobDocToJob(jobDoc, jobId || '');
  const visibility = getJobVisibility(job, { uid, role: "customer" });

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link
          to="/jobs"
          style={{ color: "#6E56CF", textDecoration: "none" }}
        >
          ← Back to My Sends
        </Link>
      </div>

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ margin: 0, marginBottom: "8px" }}>Send Details</h1>
        <div style={{ color: "#666", fontSize: "14px" }}>
          Created: {job.createdAt?.toDate?.()?.toLocaleString() || "Just now"}
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

      {/* Live Map - MOVED TO TOP */}
      <div style={{ marginBottom: "30px" }}>
        <h3>🗺️ Live Map</h3>
        <MapboxMap
          pickup={job.pickup}
          dropoff={job.dropoff}
          courierLocation={courier?.location || null}
          height="500px"
        />
        {job.courierUid && !courier?.location && (
          <p style={{ color: "#999", fontSize: "14px", marginTop: "8px" }}>
            Waiting for Senderr location updates...
          </p>
        )}
      </div>

      {/* Job Details Panel with Actions */}
      <div style={{ marginBottom: "30px" }}>
        <JobDetailsPanel job={job} visibility={visibility} showStatus={true}>
          <CustomerJobActions
            job={job}
            uid={uid}
            onJobUpdated={() => navigate("/jobs")}
          />
        </JobDetailsPanel>
      </div>

      {job.agreedFee && (
        <div
          style={{
            marginBottom: "30px",
            padding: "20px",
            background: "white",
            borderRadius: "8px",
            border: "1px solid #ddd",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Delivery Fee</h3>
          <div
            style={{ fontSize: "28px", fontWeight: "700", color: "#16a34a" }}
          >
            ${job.agreedFee.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}
