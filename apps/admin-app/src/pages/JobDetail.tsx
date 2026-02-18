import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { StatusTimeline } from "../components/v2/StatusTimeline";

type JobDoc = {
  id: string;
  status: string;
  paymentStatus?: "pending" | "authorized" | "captured" | "refunded" | string;
  paymentIntentId?: string | null;
  stripePaymentIntentId?: string | null;
  agreedFee?: number | null;
  pickupAddress?: string;
  deliveryAddress?: string;
  pickup?: { label?: string; address?: string };
  dropoff?: { label?: string; address?: string };
  courierUid?: string | null;
  createdByUid?: string;
  createdAt?: any;
  updatedAt?: any;
};

function formatDate(value: any): string {
  if (!value) return "N/A";
  if (typeof value?.toDate === "function") return value.toDate().toLocaleString();
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "N/A";
  }
}

export default function AdminJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const unsubscribe = onSnapshot(
      doc(db, "jobs", jobId),
      (snapshot) => {
        if (snapshot.exists()) {
          setJob({ id: snapshot.id, ...(snapshot.data() as Omit<JobDoc, "id">) });
        } else {
          setJob(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load job", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [jobId]);

  const setPaymentStatus = async (nextStatus: "authorized" | "captured") => {
    if (!jobId || saving) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "jobs", jobId), {
        paymentStatus: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to update payment status", error);
      alert("Failed to update payment status. Check permissions and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <p className="text-gray-600">Loading trip status...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] p-6">
        <Link to="/jobs" className="text-purple-700 hover:underline">← Back to Jobs</Link>
        <div className="mt-6 bg-white rounded-2xl p-6 shadow">
          <h1 className="text-xl font-bold text-gray-900">Job not found</h1>
          <p className="text-gray-600 mt-2">This trip may have been deleted.</p>
        </div>
      </div>
    );
  }

  const pickupLabel = job.pickupAddress || job.pickup?.address || job.pickup?.label || "N/A";
  const dropoffLabel =
    job.deliveryAddress || job.dropoff?.address || job.dropoff?.label || "N/A";

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-5xl mx-auto">
          <Link to="/jobs" className="inline-flex items-center gap-2 mb-4 hover:opacity-90">
            <span>←</span>
            <span>Back to Jobs</span>
          </Link>
          <h1 className="text-3xl font-bold">Trip Status</h1>
          <p className="text-purple-100 mt-1">Job #{job.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Live Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusTimeline currentStatus={(job.status as any) || "open"} />
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Payment Control</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-500">Payment Status</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{job.paymentStatus || "pending"}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Courier job actions unlock when this is set to <strong>authorized</strong>.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-500">Payment Intent</p>
                <p className="text-sm font-mono text-gray-900 mt-1 break-all">
                  {job.paymentIntentId || job.stripePaymentIntentId || "Not set"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => setPaymentStatus("authorized")}
                disabled={saving || job.paymentStatus === "authorized"}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                Mark Authorized
              </button>
              <button
                onClick={() => setPaymentStatus("captured")}
                disabled={saving || job.paymentStatus === "captured"}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                Mark Captured
              </button>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Status:</strong> {job.status}</p>
              <p><strong>Pickup:</strong> {pickupLabel}</p>
              <p><strong>Dropoff:</strong> {dropoffLabel}</p>
              <p><strong>Courier UID:</strong> {job.courierUid || "Unassigned"}</p>
              <p><strong>Created By:</strong> {job.createdByUid || "N/A"}</p>
              <p><strong>Created:</strong> {formatDate(job.createdAt)}</p>
              <p><strong>Updated:</strong> {formatDate(job.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
