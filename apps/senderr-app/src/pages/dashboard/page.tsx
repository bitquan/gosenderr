import { useCallback, useEffect, useMemo, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { LoadingState } from "@gosenderr/ui";

import { db } from "@/lib/firebase";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useUserDoc } from "@/hooks/v2/useUserDoc";
import { useOpenJobs } from "@/hooks/v2/useOpenJobs";
import {
  claimJob,
  declineCourierJobOffer,
  getTokenClaimReadiness,
  type TokenClaimReadiness,
} from "@/lib/v2/jobs";
import { MapboxMap } from "@/components/v2/MapboxMap";
import BottomDrawer from "@/components/v2/BottomDrawer";
import { calcFee, calcMiles } from "@/lib/v2/pricing";
import { getEligibilityReason } from "@/lib/v2/eligibility";
import type {
  FoodRateCard,
  Job,
  PackageRateCard,
  RateCard,
  TransportMode,
  VehicleType,
} from "@/lib/v2/types";

function formatStatus(status?: string): string {
  if (!status) return "Unknown";
  return status
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function CourierDashboardMapShell() {
  const navigate = useNavigate();
  const { uid, loading: authLoading } = useAuthUser();
  const { userDoc, loading: userLoading } = useUserDoc();
  const { jobs, loading: jobsLoading } = useOpenJobs();

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);
  const [decliningJobId, setDecliningJobId] = useState<string | null>(null);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [tokenClaimReadiness, setTokenClaimReadiness] =
    useState<TokenClaimReadiness | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);

  const transportMode =
    (userDoc?.courierProfile?.vehicleType as TransportMode | VehicleType) || "car";

  const courierLocation = useMemo(() => {
    const current = userDoc?.courierProfile?.currentLocation;
    if (!current) return null;

    if (Number.isFinite(current.lat) && Number.isFinite(current.lng)) {
      return { lat: current.lat, lng: current.lng };
    }

    return null;
  }, [userDoc?.courierProfile?.currentLocation]);

  const mapCourierLocation = userDoc?.courierProfile?.currentLocation || null;

  const activeJobs = useMemo(
    () =>
      jobs
        .filter(
          (job) =>
            job.courierUid === uid &&
            !["completed", "cancelled", "failed", "delivered"].includes(job.status),
        )
        .sort((a, b) => {
          const aTime = (a.updatedAt as any)?.toMillis?.() || (a.createdAt as any)?.toMillis?.() || 0;
          const bTime = (b.updatedAt as any)?.toMillis?.() || (b.createdAt as any)?.toMillis?.() || 0;
          return bTime - aTime;
        }),
    [jobs, uid],
  );

  const availableJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.status === "open" &&
          (!job.courierUid || job.courierUid === uid) &&
          (!(job as any).offerCourierUid || (job as any).offerCourierUid === uid),
      ),
    [jobs, uid],
  );

  const activeJob = activeJobs[0] || null;
  const historyJobs = useMemo(
    () =>
      jobs
        .filter((job) => ["completed", "cancelled", "failed", "delivered"].includes(job.status))
        .sort((a, b) => {
          const aTime = (a.updatedAt as any)?.toMillis?.() || (a.createdAt as any)?.toMillis?.() || 0;
          const bTime = (b.updatedAt as any)?.toMillis?.() || (b.createdAt as any)?.toMillis?.() || 0;
          return bTime - aTime;
        }),
    [jobs],
  );

  useEffect(() => {
    const preferredJobId = activeJob?.id || availableJobs[0]?.id || null;
    if (!selectedJobId && preferredJobId) {
      setSelectedJobId(preferredJobId);
      return;
    }

    if (selectedJobId) {
      const stillExists = [...activeJobs, ...availableJobs].some((job) => job.id === selectedJobId);
      if (!stillExists) {
        setSelectedJobId(preferredJobId);
      }
    }
  }, [activeJob?.id, availableJobs, activeJobs, selectedJobId]);

  const selectedJob = useMemo(
    () => [...activeJobs, ...availableJobs].find((job) => job.id === selectedJobId) || null,
    [activeJobs, availableJobs, selectedJobId],
  );

  useEffect(() => {
    if (!uid) {
      setTokenClaimReadiness(null);
      return;
    }

    let mounted = true;
    getTokenClaimReadiness(uid)
      .then((readiness) => {
        if (mounted) setTokenClaimReadiness(readiness);
      })
      .catch((error) => {
        console.error("Failed to load token claim readiness", error);
      });

    return () => {
      mounted = false;
    };
  }, [uid]);


  /* mapInstance is set by MapboxMap via onMapLoad and forwarded to the BottomDrawer */

  const isApproved = (userDoc?.courierProfile as any)?.status === "approved";
  const isOnline = Boolean(userDoc?.courierProfile?.isOnline);

  const getRateCardForJob = (job: Job): RateCard | PackageRateCard | FoodRateCard | null => {
    const isFoodJob = Boolean(
      (job as any).isFoodItem ||
        (job as any).foodDetails ||
        (job as any).foodTemperature,
    );

    return isFoodJob
      ? (userDoc?.courierProfile?.foodRateCard as FoodRateCard | null)
      : (userDoc?.courierProfile?.packageRateCard as PackageRateCard | null);
  };

  const handleToggleOnline = async () => {
    if (!uid || togglingOnline || !isApproved) return;

    setTogglingOnline(true);
    try {
      await updateDoc(doc(db, "users", uid), {
        "courierProfile.isOnline": !isOnline,
      });
    } catch (error) {
      console.error("Failed to toggle online status", error);
      alert("Unable to update availability. Please try again.");
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleAcceptJob = async (job: Job) => {
    if (!uid) return;

    if (tokenClaimReadiness?.useTokenMode && !tokenClaimReadiness.canClaim) {
      alert(
        tokenClaimReadiness.reason ||
          `Insufficient tokens. Requires ${tokenClaimReadiness.requiredTokens}.`,
      );
      return;
    }

    const rateCard = getRateCardForJob(job);
    if (!rateCard) {
      alert("Set your rate card in Settings before claiming jobs.");
      return;
    }

    const jobMiles = calcMiles(job.pickup, job.dropoff);
    const pickupMiles = courierLocation ? calcMiles(courierLocation, job.pickup) : undefined;

    if (pickupMiles !== undefined) {
      const eligibility = getEligibilityReason(rateCard, jobMiles, pickupMiles);
      if (!eligibility.eligible) {
        alert(eligibility.reason || "You are not eligible for this job.");
        return;
      }
    }

    const estimatedFee = calcFee(rateCard, jobMiles, pickupMiles, transportMode);
    const agreedFee = job.agreedFee ?? estimatedFee;

    setAcceptingJobId(job.id);
    try {
      await claimJob(job.id, uid, agreedFee);
      navigate(`/jobs/${job.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to claim job";
      alert(message);
    } finally {
      setAcceptingJobId(null);
    }
  };

  const handleDeclineJob = async (job: Job) => {
    setDecliningJobId(job.id);
    try {
      await declineCourierJobOffer(job.id);
    } catch (error) {
      console.error("Failed to decline job", error);
      alert("Unable to decline job right now.");
    } finally {
      setDecliningJobId(null);
    }
  };





  const handleMapLoad = useCallback((map: any) => {
    setMapInstance((current: any) => (current ?? map));
  }, []);

  if (authLoading || userLoading || jobsLoading) {
    return <LoadingState fullPage message="Loading map shell..." />;
  }

  if (!uid) {
    navigate("/login");
    return null;
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <div className="absolute inset-0 z-0">
        <MapboxMap
          height="100vh"
          pickup={selectedJob?.pickup}
          dropoff={selectedJob?.dropoff}
          courierLocation={mapCourierLocation as any}
          onMapLoad={handleMapLoad}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col justify-between pointer-events-none">
        <div className="pt-0 px-0 space-y-3 pointer-events-none">
          <div className="pointer-events-auto w-full bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 text-white rounded-b-3xl shadow-2xl border-b border-white/20 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-blue-100">Senderr Map Shell</p>
              <p className="text-sm font-semibold text-white">
                {activeJob ? "Active delivery in progress" : "Waiting for next delivery"}
              </p>
            </div>
            <button
              onClick={handleToggleOnline}
              disabled={togglingOnline || !isApproved}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${
                isOnline
                  ? "bg-emerald-500/25 text-emerald-100 border-emerald-300/40"
                  : "bg-slate-950/50 text-blue-100 border-white/20"
              } ${(togglingOnline || !isApproved) ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {isOnline ? "Online" : "Offline"}
            </button>
          </div>

          {tokenClaimReadiness?.useTokenMode && (
            <div
              className={`pointer-events-auto rounded-xl border p-3 ${
                tokenClaimReadiness.canClaim
                  ? "bg-gradient-to-r from-blue-700/35 via-blue-600/30 to-purple-600/30 border-blue-300/30 text-white shadow-2xl backdrop-blur"
                  : "bg-gradient-to-br from-slate-900 via-purple-900 to-purple-950/90 border-white/10 text-white shadow-2xl"
              }`}
            >
              <p className="text-xs font-semibold">Token Claim Mode</p>
              <p className="text-xs mt-1">
                Cost: {tokenClaimReadiness.requiredTokens} token
                {tokenClaimReadiness.requiredTokens === 1 ? "" : "s"} • Available: {tokenClaimReadiness.availableTokens}
              </p>
              {!tokenClaimReadiness.canClaim && (
                <div className="mt-2">
                  <Link
                    to="/settings"
                    className="inline-flex items-center rounded-md border border-blue-200/40 bg-slate-950/40 px-2 py-1 text-[11px] font-semibold text-blue-100"
                  >
                    Top up tokens
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pointer-events-auto">
          <BottomDrawer
            mapInstance={mapInstance}
            activeJob={activeJob}
            availableJobs={availableJobs}
            activeJobs={activeJobs}
            historyJobs={historyJobs}
            selectedJobId={selectedJobId}
            setSelectedJobId={setSelectedJobId}
            acceptingJobId={acceptingJobId}
            decliningJobId={decliningJobId}
            onAccept={handleAcceptJob}
            onDecline={handleDeclineJob}
            tokenClaimReadiness={tokenClaimReadiness}
          />
        </div>

      </div>
    </div>
  );
}
