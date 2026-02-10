import React from "react";
import { MapboxMap } from "@/components/v2/MapboxMap";
import { useMemo } from "react";
import { buildMapShellOverlayModel } from "@/lib/mapShell/overlayController";
import type {
  Job,
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

import type { MapShellOverlayModel } from "@/lib/mapShell/overlayController";

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
  // Dev placeholder state for overlay preview
  const overlayModel = useMemo(() => {
    if (devOverlayModel) return devOverlayModel;

    const pendingJob: Job = {
      id: "dev_job_1",
      status: "pending",
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
  }, [devOverlayModel]);

  const { uid } = useAuthUser();

  const handlePrimaryAction = async (
    action: string,
    nextStatus?: string | null,
  ) => {
    try {
      if (!uid) {
        alert("Please sign in to perform this action");
        return;
      }

      // For demo, use the dev pending job id
      const jobId = "dev_job_1";

      // Dev placeholders should not call real backend resources — skip in demo mode
      if (devPreview || jobId.startsWith("dev_")) {
        alert("Demo mode: action skipped (no backend calls in dev preview)");
        return;
      }

      if (action === "update_status" && nextStatus === "accepted") {
        // Claim the job (uses agreedFee=0 for demo)
        await claimJob(jobId, uid, 0);
        alert("Job claimed (dev)");
        return;
      }

      if (action === "update_status" && nextStatus) {
        await updateJobStatus(jobId, nextStatus as string, uid);
        alert("Job status updated (dev)");
        return;
      }

      if (
        action === "start_tracking" ||
        action === "request_location_permission"
      ) {
        try {
          await import("@/lib/location").then(async (mod) => {
            try {
              await mod.requestLocation();
              alert("Starting tracking (dev)");
            } catch (err) {
              console.error("Location request failed", err);
              alert("Please enable location permission in your browser (dev)");
            }
          });
        } catch (err) {
          console.error("Location helper failed", err);
          alert("Please enable location permission in your browser (dev)");
        }
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
