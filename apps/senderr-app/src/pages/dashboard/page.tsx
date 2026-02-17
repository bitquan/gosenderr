import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { doc, updateDoc, Timestamp, serverTimestamp } from "firebase/firestore";
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
  const { jobs, loading: jobsLoading, error: jobsError, retry: retryJobs, isOffline } = useOpenJobs();
  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [lastAcceptAttempt, setLastAcceptAttempt] = useState<{
    jobId: string;
    fee: number;
  } | null>(null);
  const [togglingOnline, setTogglingOnline] = useState(false);

  const courierLocation = userDoc?.courierProfile?.currentLocation || null;
  const transportMode = userDoc?.courierProfile?.vehicleType || "car";
  const courierStatus = (userDoc?.courierProfile as any)?.status || "none";
  const isApproved = courierStatus === "approved";
  const rejectionReason = (userDoc?.courierProfile as any)?.rejectionReason || null;
  const isOnline = Boolean(userDoc?.courierProfile?.isOnline);

  const activeJobs = useMemo(() => {
    return jobs.filter(
      (job) =>
        job.courierUid === uid &&
        !["completed", "cancelled"].includes(job.status),
    );
  }, [jobs, uid]);

  const courierJobs = useMemo(() => {
    return jobs.filter((job) => job.courierUid === uid);
  }, [jobs, uid]);

  const completedJobs = useMemo(() => {
    return courierJobs.filter((job) => job.status === "completed");
  }, [courierJobs]);

  const cancelledJobs = useMemo(() => {
    return courierJobs.filter((job) => job.status === "cancelled");
  }, [courierJobs]);

  const timeWindowStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());

    const getJobDate = (job: Job) => {
      const updatedAt = (job.updatedAt as any)?.toDate?.();
      const createdAt = (job.createdAt as any)?.toDate?.();
      return updatedAt || createdAt || null;
    };

    const calcEarnings = (items: Job[]) => {
      return items.reduce((sum, job) => {
        const fee =
          job.agreedFee ?? job.pricing?.courierRate ?? job.pricing?.totalAmount ?? 0;
        return sum + (fee || 0);
      }, 0);
    };

    const todayCompleted = completedJobs.filter((job) => {
      const date = getJobDate(job);
      return date ? date >= todayStart : false;
    });

    const weekCompleted = completedJobs.filter((job) => {
      const date = getJobDate(job);
      return date ? date >= weekStart : false;
    });

    return {
      todayEarnings: calcEarnings(todayCompleted),
      weekEarnings: calcEarnings(weekCompleted),
      todayDeliveries: todayCompleted.length,
      weekDeliveries: weekCompleted.length,
    };
  }, [completedJobs]);

  const completionRate = useMemo(() => {
    const total = completedJobs.length + cancelledJobs.length;
    if (total === 0) return null;
    return Math.round((completedJobs.length / total) * 100);
  }, [completedJobs.length, cancelledJobs.length]);

  const cancellationRate = useMemo(() => {
    const total = completedJobs.length + cancelledJobs.length;
    if (total === 0) return null;
    return Math.round((cancelledJobs.length / total) * 100);
  }, [completedJobs.length, cancelledJobs.length]);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);

  const openJobs = useMemo(() => {
    return jobs.filter((job) => job.status === "open");
  }, [jobs]);

  const currentActiveJob = activeJobs[0] || null;
  const paymentLockedActiveJobs = activeJobs.filter(
    (job) => job.paymentStatus !== "authorized",
  ).length;
  const awaitingOfferCount = openJobs.filter(
    (job) => (job as any).offerCourierUid === uid,
  ).length;
  const walletBalanceRaw =
    (userDoc as any)?.courierProfile?.tokenWallet?.balance ??
    (userDoc as any)?.tokenWallet?.balance ??
    (userDoc as any)?.wallet?.tokenBalance ??
    null;
  const walletBalance = walletBalanceRaw == null ? null : Number(walletBalanceRaw);
  const payoutMode = (userDoc as any)?.courierProfile?.payoutMode || "stripe_auto";
  const isWalletVisible = userDoc?.courierProfile?.showTokenWallet !== false;

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

    if (isOffline) {
      setAcceptError("You are offline. Reconnect to accept this job.");
      setLastAcceptAttempt({ jobId, fee });
      return;
    }

    setAcceptingJobId(jobId);
    setAcceptError(null);
    setLastAcceptAttempt({ jobId, fee });

    try {
      await claimJob(jobId, uid, fee);
      navigate(`/jobs/${jobId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to accept job";
      setAcceptError(message);
    } finally {
      setAcceptingJobId(null);
    }
  };

  const handleDeclineOffer = async (job: Job) => {
    if (!uid) return;
    try {
      const offerQueue: string[] = (job as any).offerQueue || [];
      const remaining = offerQueue.filter((id) => id !== uid);
      const nextCourierUid = remaining[0] || null;
      await updateDoc(doc(db, "jobs", job.id), {
        offerQueue: remaining,
        offerCourierUid: nextCourierUid,
        offerStatus: nextCourierUid ? "pending" : "open",
        offerExpiresAt: nextCourierUid
          ? Timestamp.fromDate(new Date(Date.now() + 90 * 1000))
          : null,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to decline offer:", error);
      alert("Failed to decline offer. Please try again.");
    }
  };

  const handleToggleOnline = async () => {
    if (!uid || !userDoc || togglingOnline || !isApproved) return;
    setTogglingOnline(true);
    try {
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

        {jobsError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-900">
            <p className="font-semibold">Unable to load live jobs</p>
            <p className="text-sm mt-1">{jobsError.message}</p>
            <button
              onClick={retryJobs}
              className="mt-3 inline-flex items-center px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {isOffline && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900">
            <p className="font-semibold">Offline mode</p>
            <p className="text-sm mt-1">You can browse cached jobs, but accept/command actions need connection.</p>
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs text-gray-500">Today’s Earnings</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatMoney(timeWindowStats.todayEarnings)}
            </p>
            <p className="text-xs text-gray-400">
              {timeWindowStats.todayDeliveries} deliveries
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs text-gray-500">Week-to-Date</p>
            <p className="text-2xl font-bold text-indigo-600">
              {formatMoney(timeWindowStats.weekEarnings)}
            </p>
            <p className="text-xs text-gray-400">
              {timeWindowStats.weekDeliveries} deliveries
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs text-gray-500">Completion Rate</p>
            <p className="text-2xl font-bold text-blue-600">
              {completionRate == null ? "—" : `${completionRate}%`}
            </p>
            <p className="text-xs text-gray-400">Based on finished jobs</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs text-gray-500">Active Deliveries</p>
            <p className="text-2xl font-bold text-indigo-600">
              {activeJobs.length}
            </p>
            <p className="text-xs text-gray-400">In your lifecycle queue</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm text-gray-600">Current Delivery</p>
                <p className="text-lg font-semibold text-gray-900">
                  {currentActiveJob ? `Job #${currentActiveJob.id.slice(0, 8)}` : "No active delivery"}
                </p>
                {currentActiveJob && (
                  <p className="text-xs text-gray-500 mt-1">
                    Status: {currentActiveJob.status.replace(/_/g, " ")}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Link
                  to={currentActiveJob ? `/jobs/${currentActiveJob.id}` : "/jobs"}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                >
                  {currentActiveJob ? "Resume Delivery" : "View Jobs"}
                </Link>
                <Link
                  to="/support"
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
                >
                  Support
                </Link>
              </div>
            </div>
            {currentActiveJob && currentActiveJob.paymentStatus !== "authorized" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Payment authorization pending</p>
                <p className="mt-1">Lifecycle actions remain locked until payment is authorized.</p>
              </div>
            )}
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-sm text-gray-600">Queue Summary</p>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span>Open jobs</span>
                <span className="font-semibold">{openJobs.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Offers waiting</span>
                <span className="font-semibold">{awaitingOfferCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Payment locked</span>
                <span className="font-semibold">{paymentLockedActiveJobs}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Cancellation rate</span>
                <span className="font-semibold">
                  {cancellationRate == null ? "—" : `${cancellationRate}%`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 lg:col-span-2">
            <p className="text-sm text-gray-600 mb-3">Compliance & Payout Readiness</p>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-gray-500">Courier approval</p>
                <p className="font-semibold text-gray-900 mt-1">
                  {(userDoc?.courierProfile as any)?.status || "not started"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-gray-500">Stripe payouts</p>
                <p className="font-semibold text-gray-900 mt-1">
                  {(userDoc as any)?.stripePayoutsEnabled || (userDoc as any)?.courierProfile?.stripePayoutsEnabled
                    ? "enabled"
                    : "not enabled"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-gray-500">Charges enabled</p>
                <p className="font-semibold text-gray-900 mt-1">
                  {(userDoc as any)?.stripeChargesEnabled || (userDoc as any)?.courierProfile?.stripeChargesEnabled
                    ? "yes"
                    : "no"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-gray-500">Wallet visibility</p>
                <p className="font-semibold text-gray-900 mt-1">
                  {userDoc?.courierProfile?.showTokenWallet === false ? "hidden" : "visible"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-gray-500">Payout mode</p>
                <p className="font-semibold text-gray-900 mt-1">
                  {payoutMode === "manual_review" ? "manual review" : "automatic"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-gray-500">Token wallet</p>
                <p className="font-semibold text-gray-900 mt-1">
                  {isWalletVisible
                    ? walletBalance == null
                      ? "not available"
                      : walletBalance.toLocaleString()
                    : "hidden in settings"}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-sm text-gray-600 mb-3">Quick Links</p>
            <div className="space-y-2">
              <Link to="/earnings" className="block rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Earnings & payouts</Link>
              <Link to="/rate-cards" className="block rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Rate cards</Link>
              <Link to="/equipment" className="block rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Equipment & badges</Link>
              <Link to="/settings" className="block rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Settings & docs</Link>
            </div>
          </div>
        </div>

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
          {acceptError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-900">
              <p className="font-semibold">Unable to accept job</p>
              <p className="text-sm mt-1">{acceptError}</p>
              {lastAcceptAttempt && (
                <button
                  onClick={() =>
                    handleAccept(lastAcceptAttempt.jobId, lastAcceptAttempt.fee)
                  }
                  disabled={Boolean(acceptingJobId)}
                  className="mt-3 inline-flex items-center px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                >
                  {acceptingJobId ? "Retrying..." : "Retry Accept"}
                </button>
              )}
            </div>
          )}
          {!isApproved ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center text-gray-600">
              Approval required before going online or viewing jobs.
            </div>
          ) : !isOnline ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center text-gray-600">
              Go online to see available jobs.
            </div>
          ) : openJobs.length === 0 ? (
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
                  onAccept={handleAccept}
                  onDecline={(job as any).offerCourierUid === uid ? handleDeclineOffer : undefined}
                  loading={acceptingJobId === job.id}
                  enableRoute={true}
                  showAcceptButton={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
