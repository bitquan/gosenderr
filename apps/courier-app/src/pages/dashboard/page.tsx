import { useEffect, useState, useMemo, useRef, type PointerEvent, type TouchEvent } from "react";
import { LoadingState } from "@gosenderr/ui";
import { useNavigate, Link } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserDoc } from "@/hooks/v2/useUserDoc";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useOpenJobs } from "@/hooks/v2/useOpenJobs";
import { MapboxMap, MapboxMapHandle } from "@/components/v2/MapboxMap";
import { claimJob } from "@/lib/v2/jobs";
import { Job } from "@/lib/v2/types";
import { calcMiles } from "@/lib/v2/pricing";
import { getEligibilityReason } from "@/lib/v2/eligibility";
import { useCourierLocationWriter } from "@/hooks/v2/useCourierLocationWriter";
import { debugLogger } from "@/utils/debugLogger";
import { useMapboxDirections } from "@/hooks/useMapboxDirections";
import { useMapFocus } from "@/hooks/useMapFocus";
import { JobThumbnail } from "@/components/navigation/JobThumbnail";

export default function CourierDashboardMobile() {
  const navigate = useNavigate();
  const { uid } = useAuthUser();
  const { userDoc, loading: userLoading } = useUserDoc();
  const { jobs, loading: jobsLoading } = useOpenJobs();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [hideIneligible, setHideIneligible] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const { isTracking, permissionDenied } = useCourierLocationWriter();
  const [sheetOpen, setSheetOpen] = useState(true);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const [collapsedOffset, setCollapsedOffset] = useState(0);
  const sheetDragStartY = useRef<number | null>(null);
  const [bottomNavOffset, setBottomNavOffset] = useState(72);
  const sheetPeekHeight = 56;
  const minCollapsedOffset = 120;
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const sheetDragStartOffset = useRef(0);
  const sheetContentRef = useRef<HTMLDivElement | null>(null);
  const sheetTouchStartY = useRef<number | null>(null);
  const sheetTouchStartOffset = useRef(0);
  const currentDragOffset = useRef(0); // Use ref to avoid re-renders during drag

  // Map and route management
  const mapRef = useRef<MapboxMapHandle>(null);
  const { routeSegments, loading: routeLoading, fetchJobRoute, clearRoute } = useMapboxDirections();
  const map = mapRef.current?.getMap();
  const { fitRoute, recenterOnDriver } = useMapFocus(map);

  debugLogger.log('render', 'Dashboard render start', {
    userLoading,
    jobsLoading,
    jobsCount: jobs.length,
    hasUserDoc: !!userDoc
  })

  useEffect(() => {
    debugLogger.log('render', 'DashboardPage mounted', {
      userLoading,
      jobsLoading,
      jobsCount: jobs.length
    })
  }, [])

  useEffect(() => {
    if (!sheetContentRef.current) return;

    const updateOffsets = () => {
      const contentHeight = sheetContentRef.current?.scrollHeight ?? 0;
      const fallbackHeight = typeof window !== 'undefined'
        ? Math.round(window.innerHeight * 0.6)
        : 400;
      const sheetHeight = contentHeight > 0 ? contentHeight : fallbackHeight;
      const nextOffset = Math.max(minCollapsedOffset, sheetHeight - sheetPeekHeight);
      console.log('updateOffsets - contentHeight:', contentHeight, 'fallbackHeight:', fallbackHeight, 'sheetHeight:', sheetHeight, 'nextOffset:', nextOffset);
      setCollapsedOffset(nextOffset);

      const nav = document.querySelector('[data-bottom-nav="true"]') as HTMLElement | null;
      if (nav) {
        setBottomNavOffset(nav.getBoundingClientRect().height);
      }
    };

    // Delay initial measurement to let content render
    const timeoutId = setTimeout(updateOffsets, 100);

    const observer = new ResizeObserver(updateOffsets);
    observer.observe(sheetContentRef.current);

    window.addEventListener('resize', updateOffsets);
    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      window.removeEventListener('resize', updateOffsets);
    };
  }, [jobs.length])

  const handleToggleOnline = async () => {
    if (!uid || togglingOnline) return;
    setTogglingOnline(true);
    try {
      const newOnlineStatus = !userDoc?.courierProfile?.isOnline;
      await updateDoc(doc(db, "users", uid), {
        "courierProfile.isOnline": newOnlineStatus,
      });
    } catch (error) {
      console.error("Failed to toggle online status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setTogglingOnline(false);
    }
  };

  const jobsWithEligibility = useMemo(() => {
    const hasPackageCard = userDoc?.courierProfile?.packageRateCard;
    const hasFoodCard = userDoc?.courierProfile?.foodRateCard;

    if (!userDoc?.courierProfile?.currentLocation || (!hasPackageCard && !hasFoodCard)) {
      return jobs.map((job) => ({
        job,
        eligible: true,
        reason: undefined,
        pickupMiles: undefined,
        jobMiles: (job.pickup && job.dropoff) ? calcMiles(job.pickup, job.dropoff) : 0,
      }));
    }

    const courierLocation = userDoc.courierProfile.currentLocation;
    const rateCard = hasPackageCard
      ? userDoc.courierProfile.packageRateCard
      : userDoc.courierProfile.foodRateCard;

    return jobs.map((job) => {
      // Guard against missing pickup/dropoff data
      if (!job.pickup || !job.dropoff) {
        return {
          job,
          eligible: false,
          reason: "Missing location data",
          pickupMiles: undefined,
          jobMiles: 0,
        };
      }

      const pickupMiles = calcMiles(courierLocation, job.pickup);
      const jobMiles = calcMiles(job.pickup, job.dropoff);
      const eligibilityResult = getEligibilityReason(rateCard, jobMiles, pickupMiles);

      return {
        job,
        eligible: eligibilityResult.eligible,
        reason: eligibilityResult.reason,
        pickupMiles,
        jobMiles,
      };
    });
  }, [jobs, userDoc]);

  // Separate active job (accepted by this courier) from available jobs
  const activeJob = useMemo(() => {
    if (!uid) return null;
    return jobs.find(job => job.courierUid === uid && job.status !== 'completed' && job.status !== 'cancelled') || null;
  }, [jobs, uid]);

  const availableJobs = useMemo(() => {
    return jobsWithEligibility.filter(item => item.job.status === 'open');
  }, [jobsWithEligibility]);

  const filteredJobs = useMemo(() => {
    if (!hideIneligible) return availableJobs;
    return availableJobs.filter((item) => item.eligible);
  }, [availableJobs, hideIneligible]);

  useEffect(() => {
    if (!userLoading && userDoc) {
      const hasRateCard =
        userDoc.courierProfile?.packageRateCard || userDoc.courierProfile?.foodRateCard;
      if (!hasRateCard) {
        navigate("/rate-cards");
      }
    }
  }, [userLoading, userDoc, navigate]);

  // Auto-select active job if exists, otherwise first available job
  useEffect(() => {
    if (activeJob) {
      setSelectedJob(activeJob);
    } else if (filteredJobs.length > 0 && !selectedJob) {
      setSelectedJob(filteredJobs[0].job);
    } else if (filteredJobs.length === 0 && !activeJob) {
      setSelectedJob(null);
    }
  }, [activeJob, filteredJobs, selectedJob]);

  // Fetch route when job is selected
  useEffect(() => {
    if (!selectedJob || !userDoc?.courierProfile?.currentLocation) {
      // Clear routes when no job is selected
      clearRoute();
      return;
    }

    // Skip if job doesn't have valid pickup/dropoff
    if (!selectedJob.pickup || !selectedJob.dropoff) {
      clearRoute();
      return;
    }

    const courierLoc = userDoc.courierProfile.currentLocation;
    fetchJobRoute(
      [courierLoc.lng, courierLoc.lat],
      [selectedJob.pickup.lng, selectedJob.pickup.lat],
      [selectedJob.dropoff.lng, selectedJob.dropoff.lat]
    );
  }, [selectedJob, userDoc?.courierProfile?.currentLocation, fetchJobRoute, clearRoute]);
  
  // Auto-fit map to route when route loads
  useEffect(() => {
    if (routeSegments.length > 0 && map) {
      const allCoordinates = routeSegments.flatMap(segment => segment.coordinates);
      fitRoute(allCoordinates);
    }
  }, [routeSegments, map, fitRoute]);

  // Auto-follow driver location when tracking and no job selected
  useEffect(() => {
    console.log('Auto-follow check:', { 
      hasMap: !!map, 
      isTracking, 
      hasSelectedJob: !!selectedJob,
      hasLocation: !!userDoc?.courierProfile?.currentLocation 
    });
    
    if (!map || !isTracking || selectedJob) return;
    
    const courierLoc = userDoc?.courierProfile?.currentLocation;
    if (courierLoc) {
      console.log('Recentering on driver at:', [courierLoc.lng, courierLoc.lat]);
      recenterOnDriver([courierLoc.lng, courierLoc.lat]);
    }
  }, [map, isTracking, selectedJob, userDoc?.courierProfile?.currentLocation, recenterOnDriver]);

  const handleAcceptJob = async (jobId: string, fee: number) => {
    if (!uid) return;
    setClaiming(true);
    try {
      await claimJob(jobId, uid, fee);
      navigate(`/jobs/${jobId}`);
    } catch (error: any) {
      console.error("Failed to claim job:", error);
      if (error.message?.includes("not-eligible")) {
        alert("You are not eligible for this job. It may exceed your distance limits.");
      } else {
        alert(error.message || "Failed to claim job. It may have been claimed by another courier.");
      }
      setClaiming(false);
      setSelectedJob(null);
    }
  };

  if (userLoading || jobsLoading) {
    return <LoadingState fullPage message="Loading dashboard..." />;
  }

  const hasRateCard =
    userDoc?.courierProfile?.packageRateCard || userDoc?.courierProfile?.foodRateCard;

  if (!hasRateCard) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <p>Setting up...</p>
      </div>
    );
  }

  const rateCard =
    userDoc.courierProfile?.packageRateCard || userDoc.courierProfile?.foodRateCard;
  const hasPackageMode = userDoc.courierProfile?.workModes?.packagesEnabled;
  const hasFoodMode = userDoc.courierProfile?.workModes?.foodEnabled;
  const needsSetup = !hasPackageMode && !hasFoodMode;

  const handleSheetPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDraggingSheet(true);
    sheetDragStartY.current = event.clientY;
    sheetDragStartOffset.current = sheetOpen ? 0 : collapsedOffset;
    currentDragOffset.current = 0;
    
    const handleMove = (e: globalThis.PointerEvent) => {
      if (sheetDragStartY.current === null || !sheetRef.current) return;
      const delta = e.clientY - sheetDragStartY.current;
      const base = sheetDragStartOffset.current;
      const next = Math.min(Math.max(base + delta, 0), collapsedOffset);
      currentDragOffset.current = next - base;
      
      // Directly update transform without triggering re-render
      const totalOffset = Math.min(Math.max(base + currentDragOffset.current, 0), collapsedOffset);
      sheetRef.current.style.transform = `translateY(${totalOffset}px)`;
    };
    
    const handleUp = () => {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // no-op
      }
      const base = sheetDragStartOffset.current;
      const finalOffset = Math.min(Math.max(base + currentDragOffset.current, 0), collapsedOffset);
      const shouldClose = finalOffset > collapsedOffset * 0.4;
      setSheetOpen(!shouldClose);
      setIsDraggingSheet(false);
      setSheetDragOffset(0);
      currentDragOffset.current = 0;
      sheetDragStartY.current = null;
      
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
    
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
  };



  const handleSheetTouchStart = () => {
    // touch handled by pointer events on handle
  };

  const handleSheetTouchMove = () => {
    // touch handled by pointer events on handle
  };

  const handleSheetTouchEnd = () => {
    // touch handled by pointer events on handle
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-gray-100">
      {/* Full-Screen Map */}
      <div className="absolute inset-0" style={{ touchAction: 'pan-x pan-y' }}>
        {(selectedJob || userDoc?.courierProfile?.currentLocation) ? (
          <>
            <MapboxMap
              ref={mapRef}
              pickup={selectedJob?.pickup}
              dropoff={selectedJob?.dropoff}
              courierLocation={(userDoc?.courierProfile?.currentLocation as any) || null}
              routeSegments={routeSegments}
              height="100%"
            />
            
            {/* Job Thumbnails Overlay */}
            {map && filteredJobs.map(({ job }) => (
              <JobThumbnail
                key={job.id}
                job={job}
                isSelected={selectedJob?.id === job.id}
                onClick={() => setSelectedJob(job)}
                map={map}
              />
            ))}
          </>
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <div className="text-center">
              <p className="text-6xl mb-4">🗺️</p>
              <p className="text-gray-600 font-medium">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Route Loading Indicator */}
      {routeLoading && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-white rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
            <span className="text-sm font-medium text-gray-700">Loading route...</span>
          </div>
        </div>
      )}

      {/* Floating Online/Offline Button (Top-Right) */}
      <button
        onClick={handleToggleOnline}
        disabled={togglingOnline}
        className={`absolute top-safe-16 right-4 z-20 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all ${
          userDoc?.courierProfile?.isOnline
            ? "bg-emerald-500 text-white"
            : "bg-gray-700 text-white"
        } ${togglingOnline ? "opacity-60" : "hover:scale-105"}`}
        style={{ marginTop: 'max(env(safe-area-inset-top), 16px)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              userDoc?.courierProfile?.isOnline ? "bg-white" : "bg-gray-400"
            }`}
          />
          {togglingOnline
            ? "Updating..."
            : userDoc?.courierProfile?.isOnline
              ? "Online"
              : "Offline"}
        </div>
      </button>

      {/* Filter Toggle Button (Top-Left) */}
      <button
        onClick={() => setHideIneligible(!hideIneligible)}
        className="absolute top-safe-16 left-4 z-20 px-4 py-2.5 bg-white rounded-xl font-semibold text-sm shadow-lg hover:scale-105 transition-transform"
        style={{ marginTop: 'max(env(safe-area-inset-top), 16px)' }}
      >
        {hideIneligible ? "Show All" : "Hide Ineligible"}
      </button>

      {/* Setup Warning Banner */}
      {needsSetup && (
        <div className="absolute top-20 left-4 right-4 z-20 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="font-semibold text-yellow-900 text-sm mb-1">
                ⚠️ Setup Required
              </p>
              <p className="text-xs text-yellow-800">
                Enable at least one work mode to start accepting sends.
              </p>
            </div>
            <Link
              to="/rate-cards"
              className="px-3 py-2 bg-yellow-500 text-white rounded-lg text-xs font-bold whitespace-nowrap hover:bg-yellow-600"
            >
              Setup →
            </Link>
          </div>
        </div>
      )}

      {/* Location Tracking Status */}
      {userDoc?.courierProfile?.isOnline && (
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-2 rounded-lg text-xs font-medium shadow-lg ${
            isTracking
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-yellow-50 text-yellow-700 border border-yellow-200"
          }`}
        >
          {isTracking
            ? "📍 Tracking Active"
            : permissionDenied
              ? "⚠️ Location Denied"
              : "⚠️ Tracking Inactive"}
        </div>
      )}

      {/* Bottom Sheet - Jobs List */}
      <div
        ref={sheetRef}
        className="absolute left-0 right-0 z-30 bg-white rounded-t-3xl shadow-2xl max-h-[60vh] overflow-hidden pointer-events-none"
        style={{
          bottom: 0,
          transform: `translateY(${Math.min(
            Math.max((sheetOpen ? 0 : collapsedOffset) + sheetDragOffset, 0),
            collapsedOffset
          )}px)`,
          transition: isDraggingSheet ? 'none' : 'transform 200ms ease',
          willChange: 'transform',
          paddingBottom: `var(--bottom-nav-height, ${bottomNavOffset}px)`,
        }}
      >
        <div
          ref={sheetContentRef}
          className="pointer-events-auto overflow-y-auto"
          style={{ touchAction: 'pan-y' }}
        >
        {/* Drag Handle */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing select-none"
          onPointerDown={handleSheetPointerDown}
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
          style={{ touchAction: 'none' }}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Sheet Header */}
        <div className="px-6 pb-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {activeJob ? 'Active Send' : `Available Sends (${filteredJobs.length})`}
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (isDraggingSheet) return;
                  setSheetOpen((prev) => !prev);
                  setSheetDragOffset(0);
                  sheetDragStartY.current = null;
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {sheetOpen ? 'Close' : 'Open'}
              </button>
              <Link
                to="/settings"
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Settings
              </Link>
            </div>
          </div>
        </div>

        {/* Jobs List Content */}
        <div className="overflow-y-auto max-h-[calc(60vh-80px)] pb-6">
          {activeJob ? (
            // Show active job
            <div className="px-4 pt-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-300 shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                    ACTIVE
                  </div>
                  <span className="text-sm text-gray-600">
                    {activeJob.status.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <div className="mb-2">
                  <div className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                    <span className="text-green-600">📍</span>
                    <span className="font-medium">Pickup:</span> {activeJob.pickup.label}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-1">
                    <span className="text-red-600">🎯</span>
                    <span className="font-medium">Dropoff:</span> {activeJob.dropoff.label}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/jobs/${activeJob.id}`)}
                  className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700"
                >
                  View Job Details
                </button>
              </div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12 px-6">
              {jobsWithEligibility.length === 0 ? (
                <>
                  <p className="text-4xl mb-3">📦</p>
                  <p className="text-gray-700 font-medium">No open sends right now</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Check back soon or make sure you're online
                  </p>
                </>
              ) : (
                <>
                  <p className="text-4xl mb-3">🗺️</p>
                  <p className="text-gray-700 font-medium">All sends outside your area</p>
                  <button
                    onClick={() => setHideIneligible(false)}
                    className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600"
                  >
                    Show All Sends
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="px-4 pt-4 space-y-3">
              {filteredJobs.map(({ job, eligible, reason, pickupMiles, jobMiles }) => (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all ${
                    selectedJob?.id === job.id
                      ? "bg-emerald-50 border-2 border-emerald-500 shadow-md"
                      : eligible
                        ? "bg-white border-2 border-gray-200 hover:border-gray-300"
                        : "bg-red-50 border-2 border-red-300"
                  }`}
                >
                  {!eligible && (
                    <div className="mb-3 inline-block px-3 py-1 bg-red-100 border border-red-200 rounded-lg">
                      <p className="text-xs font-semibold text-red-700">⚠️ Not Eligible</p>
                      {reason && <p className="text-xs text-red-600 mt-0.5">{reason}</p>}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">
                      {job.createdAt?.toDate?.()?.toLocaleString() || "Just now"}
                    </p>

                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2">
                        <span className="text-base">📍</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {job.pickup.label ||
                              `${job.pickup.lat.toFixed(4)}, ${job.pickup.lng.toFixed(4)}`}
                          </p>
                          {pickupMiles && (
                            <p className="text-xs text-gray-500">
                              {pickupMiles.toFixed(1)} mi away
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="text-base">🎯</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {job.dropoff.label ||
                              `${job.dropoff.lat.toFixed(4)}, ${job.dropoff.lng.toFixed(4)}`}
                          </p>
                          {jobMiles && (
                            <p className="text-xs text-gray-500">
                              {jobMiles.toFixed(1)} mi trip
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedJob?.id === job.id && eligible && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const fee = rateCard
                            ? calcMiles(job.pickup, job.dropoff) * rateCard.perMile
                            : 0;
                          handleAcceptJob(job.id, fee);
                        }}
                        disabled={claiming}
                        className={`w-full mt-3 py-3 bg-emerald-500 text-white rounded-xl font-semibold shadow-lg ${
                          claiming ? "opacity-60" : "hover:bg-emerald-600"
                        }`}
                      >
                        {claiming ? "Accepting..." : "Accept Job"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
