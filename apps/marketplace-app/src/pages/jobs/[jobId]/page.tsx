
import { useParams } from "react-router-dom";
import { Navigate, useNavigate } from "react-router-dom";
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
import { PaymentForm } from "@/components/v2/PaymentForm";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

// Convert JobDoc to features Job
function convertJobDocToJob(jobDoc: JobDoc, id: string): FeatureJob {
  return { ...jobDoc, id } as FeatureJob;
}

export default function CustomerJobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { uid, loading: authLoading } = useAuthUser();
  const { job: jobDoc, loading: jobLoading } = useJob(jobId || '');
  const { courier } = useCourierById(jobDoc?.courierUid || null);

  if (authLoading || jobLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading your send...</p>
        </div>
      </div>
    );
  }

  if (!uid) {
    return <Navigate to="/login" replace />;
  }

  if (!jobDoc) {
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

  // Status-based styling
  const statusColors = {
    pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-100' },
    accepted: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100' },
    'en-route-to-pickup': { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', badge: 'bg-indigo-100' },
    'arrived-at-pickup': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', badge: 'bg-purple-100' },
    'package-picked-up': { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-800', badge: 'bg-cyan-100' },
    'en-route-to-dropoff': { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', badge: 'bg-teal-100' },
    completed: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100' },
    cancelled: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100' },
  };

  const currentStatus = statusColors[job.status as keyof typeof statusColors] || statusColors.pending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {job.paymentStatus === "authorized" && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 mb-6">
            <p className="font-semibold">Payment authorized</p>
            <p className="text-sm">Your payment method is secured and will be captured after delivery.</p>
          </div>
        )}
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to My Sends
          </Link>
        </div>

        {/* Title Card */}
        <div className="bg-gradient-to-br from-violet-200/80 via-fuchsia-200/65 to-blue-200/70 border border-violet-200/80 rounded-2xl shadow-lg p-6 mb-6 border border-purple-100">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Send Details</h1>
              <p className="text-gray-500 text-sm">
                Created {job.createdAt?.toDate?.()?.toLocaleString() || "Just now"}
              </p>
            </div>
            <div className={`${currentStatus.badge} ${currentStatus.text} px-4 py-2 rounded-full font-semibold text-sm`}>
              {job.status.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-gradient-to-br from-violet-200/80 via-fuchsia-200/65 to-blue-200/70 border border-violet-200/80 rounded-2xl shadow-lg p-6 mb-6 border border-purple-100">
          <StatusTimeline currentStatus={job.status} />
        </div>

        {/* Live Map */}
        <div className="bg-gradient-to-br from-violet-200/80 via-fuchsia-200/65 to-blue-200/70 border border-violet-200/80 rounded-2xl shadow-lg overflow-hidden mb-6 border border-purple-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Live Tracking
            </h3>
          </div>
          <MapboxMap
            pickup={job.pickup}
            dropoff={job.dropoff}
            courierLocation={courier?.location || null}
            pickupProof={job.pickupProof || null}
            dropoffProof={job.dropoffProof || null}
            height="500px"
          />
          {job.courierUid && !courier?.location && (
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <p className="text-gray-500 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Waiting for Senderr location updates...
              </p>
            </div>
          )}
        </div>

        {/* Job Details & Actions */}
        <div className="bg-gradient-to-br from-violet-200/80 via-fuchsia-200/65 to-blue-200/70 border border-violet-200/80 rounded-2xl shadow-lg p-6 mb-6 border border-purple-100">
          <JobDetailsPanel job={job} visibility={visibility} showStatus={true}>
            <CustomerJobActions
              job={job}
              uid={uid}
              onJobUpdated={() => navigate("/jobs")}
            />
          </JobDetailsPanel>
        </div>

        {(job.pickupProof || job.dropoffProof) && (
          <div className="bg-gradient-to-br from-violet-200/80 via-fuchsia-200/65 to-blue-200/70 border border-violet-200/80 rounded-2xl shadow-lg p-6 mb-6 border border-purple-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Proof Photos</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {job.pickupProof && (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">Pickup Photo</p>
                    <p className="text-xs text-gray-500">
                      {job.pickupProof.timestamp?.toDate?.()?.toLocaleString() || "Just now"}
                    </p>
                  </div>
                  <img
                    src={job.pickupProof.url}
                    alt="Pickup proof"
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-3 text-xs text-gray-600">
                    📍 {job.pickupProof.location.lat.toFixed(5)}, {job.pickupProof.location.lng.toFixed(5)}
                  </div>
                </div>
              )}
              {job.dropoffProof && (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">Dropoff Photo</p>
                    <p className="text-xs text-gray-500">
                      {job.dropoffProof.timestamp?.toDate?.()?.toLocaleString() || "Just now"}
                    </p>
                  </div>
                  <img
                    src={job.dropoffProof.url}
                    alt="Dropoff proof"
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-3 text-xs text-gray-600">
                    📍 {job.dropoffProof.location.lat.toFixed(5)}, {job.dropoffProof.location.lng.toFixed(5)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {job.pricing && job.paymentStatus !== "authorized" && (
          <div className="bg-gradient-to-br from-violet-200/80 via-fuchsia-200/65 to-blue-200/70 border border-violet-200/80 rounded-2xl shadow-lg p-6 mb-6 border border-purple-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Checkout</h3>
            <PaymentForm
              jobId={job.id}
              courierRate={job.pricing.courierRate}
              platformFee={job.pricing.platformFee}
              onSuccess={async (paymentIntentId) => {
                await updateDoc(doc(db, "jobs", job.id), {
                  paymentStatus: "authorized",
                  paymentIntentId: paymentIntentId || null,
                  updatedAt: serverTimestamp(),
                });
              }}
            />
          </div>
        )}

        {/* Delivery Fee */}
        {job.agreedFee && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">Delivery Fee</h3>
                <p className="text-4xl font-bold text-green-600">${job.agreedFee.toFixed(2)}</p>
              </div>
              <svg className="w-16 h-16 text-green-200" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
