import React from "react";
import { MapboxMap } from "@/components/v2/MapboxMap";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { buildMapShellOverlayModel } from "@/lib/mapShell/overlayController";
import type {
  Job as MapShellJob,
  JobsSyncState,
  LocationSnapshot,
  MapShellOverlayModel,
} from "@/lib/mapShell/overlayController";
import ActiveJobOverlay from "@/components/mapShell/ActiveJobOverlay";
import SettingsOverlay from "@/components/mapShell/SettingsOverlay";
import MapShellLayout from "@/components/mapShell/MapShellLayout";
import { Slot } from "@/components/mapShell/slots";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { claimJob, updateJobStatus } from "@/lib/v2/jobs";
import { useOpenJobs } from "@/hooks/v2/useOpenJobs";
import { useUserDoc } from "@/hooks/v2/useUserDoc";
import { useCourierLocationWriter } from "@/hooks/v2/useCourierLocationWriter";
import type { Job, JobStatus } from "@/lib/v2/types";
import { calcFee, calcMiles } from "@/lib/v2/pricing";
import { requestLocation } from "@/lib/location";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type MapShellScreenProps = {
  className?: string;
  children?: React.ReactNode;
  // Optional dev injection for overlay model so tests and previews can simulate states
  devOverlayModel?: MapShellOverlayModel;
  // Whether this render is using the dev preview bypass (from ?dev_preview=1)
  devPreview?: boolean;
};

export default function MapShellScreen({
  className = "",
  children,
  devOverlayModel,
  devPreview = false,
}: MapShellScreenProps) {
  const navigate = useNavigate();
  const { uid } = useAuthUser();
  const { jobs, syncState } = useOpenJobs() as any;
  const { userDoc } = useUserDoc();
  const { isTracking, permissionDenied } = useCourierLocationWriter();

  const courierLocation: LocationSnapshot = userDoc?.courierProfile
    ?.currentLocation
    ? {
        latitude: userDoc.courierProfile.currentLocation.lat,
        longitude: userDoc.courierProfile.currentLocation.lng,
      }
    : null;

  const isTerminalStatus = (status: JobStatus): boolean =>
    ["completed", "cancelled", "failed", "expired", "disputed"].includes(
      status,
    );

  const activeJob = useMemo(() => {
    if (!uid) return null;
    return (
      jobs.find(
        (job) => job.courierUid === uid && !isTerminalStatus(job.status),
      ) ?? null
    );
  }, [jobs, uid]);

  const latestJob = useMemo(() => {
    if (activeJob) return null;
    return jobs.find((job) => job.status === "open") ?? null;
  }, [activeJob, jobs]);

  const mapToOverlayJob = (job: Job | null): MapShellJob | null => {
    if (!job) return null;
    return {
      id: job.id,
      status: job.status,
      pickupLocation: job.pickup
        ? { latitude: job.pickup.lat, longitude: job.pickup.lng }
        : null,
      dropoffLocation: job.dropoff
        ? { latitude: job.dropoff.lat, longitude: job.dropoff.lng }
        : null,
      notes: job.package?.notes ?? null,
    };
  };

  const computeAgreedFee = (job: Job): number | null => {
    const courierLocation = userDoc?.courierProfile?.currentLocation;
    if (!courierLocation) return null;
    if (!job.pickup || !job.dropoff) return null;

    const jobWithFood = job as Job & { isFoodItem?: boolean };
    const isFoodJob = Boolean(jobWithFood.isFoodItem);
    const rateCard = isFoodJob
      ? userDoc?.courierProfile?.foodRateCard
      : userDoc?.courierProfile?.packageRateCard;

    if (!rateCard) return null;

    const pickupMiles = calcMiles(courierLocation, job.pickup);
    const jobMiles = calcMiles(job.pickup, job.dropoff);
    return calcFee(
      rateCard,
      jobMiles,
      pickupMiles,
      userDoc?.courierProfile?.vehicleType,
    );
  };

  // Dev placeholder state for overlay preview
  const overlayModel = useMemo(() => {
    if (devOverlayModel) return devOverlayModel;

    if (devPreview) {
      const pendingJob: MapShellJob = {
        id: "dev_job_1",
        status: "open",
        pickupLocation: { latitude: 37.7901, longitude: -122.4002 },
        dropoffLocation: { latitude: 37.7911, longitude: -122.4012 },
      };

      return buildMapShellOverlayModel({
        activeJob: pendingJob,
        latestJob: null,
        jobsSyncState: { status: "ok" } as JobsSyncState,
        courierLocation: null as LocationSnapshot,
        tracking: false,
        hasPermission: false,
      });
    }

    return buildMapShellOverlayModel({
      activeJob: mapToOverlayJob(activeJob),
      latestJob: mapToOverlayJob(latestJob),
      jobsSyncState: syncState as JobsSyncState,
      courierLocation,
      tracking: isTracking,
      hasPermission: !permissionDenied,
    });
  }, [
    activeJob,
    courierLocation,
    devOverlayModel,
    devPreview,
    isTracking,
    latestJob,
    permissionDenied,
    syncState,
  ]);

  const handlePrimaryAction = async (
    action: string,
    nextStatus?: string | null,
  ) => {
    try {
      if (!uid) {
        alert("Please sign in to perform this action");
        return;
      }

      const actionJob = devPreview
        ? ({ id: "dev_job_1" } as Job)
        : activeJob ?? latestJob;

      if (!actionJob) {
        alert("No active job available for this action");
        return;
      }

      const jobId = actionJob.id;

      // Dev placeholders should not call real backend resources — skip in demo mode
      if (devPreview || jobId.startsWith("dev_")) {
        alert("Demo mode: action skipped (no backend calls in dev preview)");
        return;
      }

      if (action === "update_status" && nextStatus === "assigned") {
        const agreedFee = computeAgreedFee(actionJob);
        if (agreedFee === null) {
          alert(
            "Unable to calculate agreed fee. Check rate cards and location.",
          );
          return;
        }
        await claimJob(jobId, uid, agreedFee);
        alert("Job claimed");
        return;
      }

      if (action === "update_status" && nextStatus) {
        await updateJobStatus(jobId, nextStatus as JobStatus, uid);
        alert("Job status updated");
        return;
      }

      if (
        action === "start_tracking" ||
        action === "request_location_permission"
      ) {
        try {
          await requestLocation();
          if (action === "start_tracking") {
            await updateDoc(doc(db, "users", uid), {
              "courierProfile.isOnline": true,
            });
          }
          alert("Location permissions updated");
        } catch (err) {
          console.error("Location helper failed", err);
          alert("Please enable location permission in your browser");
        }
        return;
      }

      if (action === "open_job_detail") {
        navigate(`/jobs/${jobId}`);
        return;
      }

      console.log("Unhandled action", action, nextStatus);
    } catch (err) {
      console.error("Action failed", err);
      alert(`Action failed: ${(err as Error).message}`);
    }
  };

  return (
    <div
      className={`min-h-screen relative bg-[#F8F9FF] ${className}`}
      aria-label="MapShell"
    >
      {/* Map surface (background) */}
      <div className="absolute inset-0 z-0" role="region" aria-label="Map view">
        {/* Make the map fill the viewport */}
        <MapboxMap height="100vh" />
      </div>

      {/* Overlay slots and page content */}
      <div className="relative z-10 pointer-events-none">
        {devPreview && (
          <div
            data-testid="mapshell-dev-banner"
            className="fixed top-0 left-0 right-0 bg-yellow-200 text-yellow-900 text-xs p-2 text-center z-40"
          >
            DEV PREVIEW: MapShell (dev)
          </div>
        )}
        <div className="top-0 left-0 right-0 p-4">{/* top overlay slot */}</div>

        <div className="flex justify-center items-center mt-24">
          {/* center overlay slot */}
        </div>

        <div className="fixed bottom-6 left-0 right-0 flex justify-center p-4">
          {/* bottom overlay slot */}
        </div>

        {/* Children (pages) will render here and may opt-in to overlay slots via context in future work */}
        <div className="p-4 pointer-events-auto">{children}</div>

        {/* Stable overlay slots (via MapShellLayout/Slot) */}
        <MapShellLayout>
          {/* Top-right slot for overlays */}
          <Slot name="topRight">
            <div data-testid="active-overlay" className="pointer-events-auto">
              <ActiveJobOverlay
                model={overlayModel}
                onPrimaryAction={handlePrimaryAction}
              />
            </div>

            <div className="pointer-events-auto">
              <SettingsOverlay />
            </div>
          </Slot>
        </MapShellLayout>
      </div>
    </div>
  );
}
