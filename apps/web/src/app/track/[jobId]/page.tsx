"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { MapboxMap } from "@/components/v2/MapboxMap";
import type { Job, JobStatus } from "@/features/jobs/shared/types";

const statusOrder: JobStatus[] = [
  "open",
  "assigned",
  "enroute_pickup",
  "arrived_pickup",
  "picked_up",
  "enroute_dropoff",
  "arrived_dropoff",
  "completed",
];

const statusLabels: Record<JobStatus, string> = {
  open: "Open",
  assigned: "Assigned",
  enroute_pickup: "En route to pickup",
  arrived_pickup: "Arrived at pickup",
  picked_up: "Picked up",
  enroute_dropoff: "En route to dropoff",
  arrived_dropoff: "Arrived at dropoff",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
  expired: "Expired",
  failed: "Failed",
};

export default function JobTrackingPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    const unsub = onSnapshot(
      doc(db, "jobs", jobId),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setJob({ id: snap.id, ...(snap.data() as Job) });
        setLoading(false);
      },
      (error) => {
        console.error("Error loading job:", error);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [jobId]);

  const statusIndex = useMemo(() => {
    if (!job) return -1;
    return statusOrder.indexOf(job.status);
  }, [job]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading tracking...</div>
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <Card variant="elevated" className="max-w-md">
          <CardContent>
            <h2 className="text-lg font-semibold">Job not found</h2>
            <p className="text-sm text-gray-600 mt-2">
              We couldn't locate that delivery job.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Live Job Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Job ID</p>
                <p className="font-mono text-sm">{job.id}</p>
              </div>
              <StatusBadge
                status={
                  job.status === "completed"
                    ? "completed"
                    : job.status === "cancelled"
                      ? "cancelled"
                      : "in_progress"
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Route Map</CardTitle>
          </CardHeader>
          <CardContent>
            <MapboxMap pickup={job.pickup} dropoff={job.dropoff} />
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Status Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statusOrder.map((status, index) => (
                <div
                  key={status}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                    index <= statusIndex
                      ? "bg-purple-50 text-purple-700"
                      : "bg-gray-50 text-gray-400"
                  }`}
                >
                  <span className="font-medium">{statusLabels[status]}</span>
                  {index <= statusIndex && <span>✓</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
