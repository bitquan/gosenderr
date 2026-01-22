"use client";

import { use } from "react";
import { useParams, useRouter } from "next/navigation";
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
import Link from "next/link";
import { NotFoundPage } from "@/components/ui/NotFoundPage";

// Convert JobDoc to features Job
function convertJobDocToJob(jobDoc: JobDoc, id: string): FeatureJob {
  return { ...jobDoc, id } as FeatureJob;
}

export default function CustomerJobDetail({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const router = useRouter();
  const { uid } = useAuthUser();
  const { job: jobDoc, loading: jobLoading } = useJob(jobId);
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
        title="Job not found"
        description="We couldn't locate that delivery job."
        actionHref="/customer/jobs"
        actionLabel="Back to My Jobs"
        emoji="🧾"
      />
    );
  }

  const job = convertJobDocToJob(jobDoc, jobId);
  const visibility = getJobVisibility(job, { uid, role: "customer" });

  return (
    <div style={{ padding: "30px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link
          href="/customer/jobs"
          style={{ color: "#6E56CF", textDecoration: "none" }}
        >
          ← Back to My Jobs
        </Link>
      </div>

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ margin: 0, marginBottom: "8px" }}>Job Details</h1>
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
            Waiting for courier location updates...
          </p>
        )}
      </div>

      {/* Job Details Panel with Actions */}
      <div style={{ marginBottom: "30px" }}>
        <JobDetailsPanel job={job} visibility={visibility} showStatus={true}>
          <CustomerJobActions
            job={job}
            uid={uid}
            onJobUpdated={() => router.push("/customer/jobs")}
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
