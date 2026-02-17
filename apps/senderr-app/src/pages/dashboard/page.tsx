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
  const [drawerTab, setDrawerTab] = useState<"offers" | "active" | "history">("offers");
  const [drawerSnap, setDrawerSnap] = useState<"collapsed" | "mid" | "expanded">("mid");
  const [isCompactScreen, setIsCompactScreen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false,
  );
  const [dragStartY, setDragStartY] = useState<number | null>(null);
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

  useEffect(() => {
    const onResize = () => setIsCompactScreen(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!mapInstance) return;
    const onMapDragStart = () => setDrawerSnap("collapsed");
    mapInstance.on("dragstart", onMapDragStart);
    return () => {
      mapInstance.off("dragstart", onMapDragStart);
    };
  }, [mapInstance]);

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

  const handleDrawerPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    setDragStartY(event.clientY);
  };

  const handleDrawerPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragStartY === null) return;

    const deltaY = event.clientY - dragStartY;
    const threshold = 40;

    if (Math.abs(deltaY) < threshold) {
      setDrawerSnap((prev) => (prev === "collapsed" ? "mid" : prev === "mid" ? "expanded" : "mid"));
      setDragStartY(null);
      return;
    }

    if (deltaY > 0) {
      setDrawerSnap((prev) => (prev === "expanded" ? "mid" : "collapsed"));
    } else {
      setDrawerSnap((prev) => (prev === "collapsed" ? "mid" : "expanded"));
    }

    setDragStartY(null);
  };

  const drawerHeights = isCompactScreen
    ? {
        collapsed: "20vh",
        mid: "38vh",
        expanded: "62vh",
      }
    : {
        collapsed: "24vh",
        mid: "46vh",
        expanded: "72vh",
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

        <div
          className="pointer-events-auto rounded-t-3xl bg-gradient-to-br from-slate-900 via-purple-900 to-purple-950/90 border-t border-white/10 shadow-2xl text-white backdrop-blur transition-all duration-200"
          style={{ height: drawerHeights[drawerSnap], minHeight: isCompactScreen ? "140px" : "180px" }}
        >
          <div className="flex h-full flex-col">
            <div className="sticky top-0 z-20 bg-gradient-to-br from-slate-900/95 via-purple-900/95 to-purple-950/95 border-b border-white/10 px-4 pt-2 pb-3">
              <div className="flex justify-center mb-2">
                <button
                  aria-label="Resize queue drawer"
                  onPointerDown={handleDrawerPointerDown}
                  onPointerUp={handleDrawerPointerUp}
                  className="h-5 w-24 rounded-full flex items-center justify-center"
                >
                  <span className="h-1.5 w-12 rounded-full bg-white/40" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Map Shell Queue</h2>
                <div className="flex items-center gap-2 text-xs">
                  <Link to="/settings" className="text-blue-200 font-semibold hover:text-white">Settings</Link>
                  <span className="text-white/30">•</span>
                  <Link to="/earnings" className="text-blue-200 font-semibold hover:text-white">Earnings</Link>
                </div>
            </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { id: "offers", label: `Offers (${availableJobs.length})` },
                  { id: "active", label: `Active (${activeJobs.length})` },
                  { id: "history", label: `History (${historyJobs.length})` },
                ].map((tab) => {
                  const isActive = drawerTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setDrawerTab(tab.id as "offers" | "active" | "history")}
                      className={`rounded-lg px-2 py-1.5 text-[11px] sm:text-xs font-semibold transition-colors ${
                        isActive
                          ? "bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 text-white"
                          : "bg-white/10 text-blue-100 hover:bg-white/20"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeJob && (
              <div className="px-4 pt-3 pb-2 border-b border-white/10 bg-slate-950/35">
                <div className="rounded-xl border border-blue-300/30 bg-blue-600/20 p-3">
                  <p className="text-xs text-blue-100 font-semibold">Current Job</p>
                  <p className="text-sm font-semibold text-white mt-1">{formatStatus(activeJob.status)}</p>
                  <p className="text-xs text-blue-100 mt-1">
                    Pickup: {activeJob.pickup?.label || "Pickup point"}
                  </p>
                  <p className="text-xs text-blue-100">
                    Dropoff: {activeJob.dropoff?.label || "Dropoff point"}
                  </p>
                  <div className="mt-2">
                    <Link
                      to={`/jobs/${activeJob.id}`}
                      className="inline-flex items-center rounded-md bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Open active job
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {drawerTab === "offers" && (
                <div className="space-y-2">
                  {availableJobs.length === 0 && (
                    <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-sm text-blue-100">
                      No open offers right now. Stay online and refresh shortly.
                    </div>
                  )}

                  {availableJobs.map((job) => {
                    const selected = selectedJobId === job.id;
                    const canClaim = !(tokenClaimReadiness?.useTokenMode && !tokenClaimReadiness?.canClaim);

                    return (
                      <div
                        key={job.id}
                        className={`rounded-xl border p-3 ${
                          selected ? "border-blue-300/40 bg-blue-600/20" : "border-white/15 bg-white/10"
                        }`}
                      >
                        <button
                          onClick={() => setSelectedJobId(job.id)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white">
                              {job.package?.size ? `${job.package.size} package` : "Delivery offer"}
                            </p>
                            <span className="text-xs font-semibold text-emerald-300">
                              ${(job.agreedFee || 0).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-blue-100 mt-1">
                            {job.pickup?.label || "Pickup"} → {job.dropoff?.label || "Dropoff"}
                          </p>
                        </button>

                        {selected && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleAcceptJob(job)}
                              disabled={acceptingJobId === job.id || !canClaim}
                              className={`rounded-lg px-3 py-2 text-xs font-semibold text-white ${
                                acceptingJobId === job.id || !canClaim
                                  ? "bg-gray-300 cursor-not-allowed"
                                  : "bg-emerald-600 hover:bg-emerald-700"
                              }`}
                            >
                              {acceptingJobId === job.id
                                ? "Claiming..."
                                : !canClaim
                                  ? "Top-up required"
                                  : "Claim from map"}
                            </button>

                            <button
                              onClick={() => handleDeclineJob(job)}
                              disabled={decliningJobId === job.id}
                              className={`rounded-lg px-3 py-2 text-xs font-semibold border ${
                                decliningJobId === job.id
                                  ? "bg-white/10 text-white/40 border-white/15 cursor-not-allowed"
                                  : "bg-transparent text-blue-100 border-white/25 hover:bg-white/10"
                              }`}
                            >
                              {decliningJobId === job.id ? "Declining..." : "Decline"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {drawerTab === "active" && (
                <div className="space-y-2">
                  {activeJobs.length === 0 && (
                    <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-sm text-blue-100">
                      No active jobs right now.
                    </div>
                  )}

                  {activeJobs.map((job) => (
                    <div key={job.id} className="rounded-xl border border-white/15 bg-white/10 p-3">
                      <p className="text-sm font-semibold text-white">{formatStatus(job.status)}</p>
                      <p className="text-xs text-blue-100 mt-1">
                        {job.pickup?.label || "Pickup"} → {job.dropoff?.label || "Dropoff"}
                      </p>
                      <div className="mt-2">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="inline-flex items-center rounded-md bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Open active job
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {drawerTab === "history" && (
                <div className="space-y-2">
                  {historyJobs.length === 0 && (
                    <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-sm text-blue-100">
                      No completed or cancelled jobs yet.
                    </div>
                  )}

                  {historyJobs.map((job) => (
                    <div key={job.id} className="rounded-xl border border-white/15 bg-white/10 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{formatStatus(job.status)}</p>
                        <span className="text-xs font-semibold text-emerald-300">
                          ${(job.agreedFee || 0).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-blue-100 mt-1">
                        {job.pickup?.label || "Pickup"} → {job.dropoff?.label || "Dropoff"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
