"use client";

import { useParams, useRouter } from "next/navigation";
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
import Link from "next/link";
import { NotFoundPage } from "@/components/ui/NotFoundPage";

// Convert JobDoc to features Job
function convertJobDocToJob(jobDoc: JobDoc, id: string): FeatureJob {
  return { ...jobDoc, id } as FeatureJob;
}

export default function CourierJobDetail() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;
  const { uid } = useAuthUser();
  const { job: jobDoc, loading: jobLoading } = useJob(jobId);
  const { userDoc } = useUserDoc();

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
        actionHref="/courier/dashboard"
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
        actionHref="/courier/dashboard"
        actionLabel="Back to Dashboard"
        emoji="🔒"
      />
    );
  }

  const visibility = getJobVisibility(job, { uid, role: "courier" });
  const pickupGoogleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${job.pickup.lat},${job.pickup.lng}`;
  const dropoffGoogleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${job.dropoff.lat},${job.dropoff.lng}`;

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link
          href="/courier/dashboard"
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
              if (job.status === "arrived_dropoff") {
                setTimeout(() => router.push("/courier/dashboard"), 1000);
              }
            }}
          />
        </JobDetailsPanel>
      </div>

      {/* Navigation Links */}
      <div style={{ marginBottom: "30px", display: "flex", gap: "12px" }}>
        <a
          href={pickupGoogleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            padding: "12px",
            background: "#6E56CF",
            color: "white",
            textDecoration: "none",
            borderRadius: "8px",
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          Navigate to Pickup 🗺️
        </a>
        <a
          href={dropoffGoogleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            padding: "12px",
            background: "#16a34a",
            color: "white",
            textDecoration: "none",
            borderRadius: "8px",
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          Navigate to Dropoff 🗺️
        </a>
      </div>

      <div>
        <h3>Live Map</h3>
        <MapboxMap
          pickup={job.pickup}
          dropoff={job.dropoff}
          courierLocation={userDoc?.location || null}
          height="500px"
        />
      </div>
    </div>
  );
}
