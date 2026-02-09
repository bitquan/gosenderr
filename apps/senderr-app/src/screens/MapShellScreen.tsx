import React from "react";
import { MapboxMap } from "@/components/v2/MapboxMap";
import { useMemo } from "react";
import { buildMapShellOverlayModel } from "@/lib/mapShell/overlayController";
import ActiveJobOverlay from "@/components/mapShell/ActiveJobOverlay";
import SettingsOverlay from "@/components/mapShell/SettingsOverlay";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { claimJob, updateJobStatus } from "@/lib/v2/jobs";

export type MapShellScreenProps = {
  className?: string;
  children?: React.ReactNode;
};

export default function MapShellScreen({
  className = "",
  children,
}: MapShellScreenProps) {
  // Dev placeholder state for overlay preview
  const overlayModel = useMemo(() => {
    const pendingJob = {
      id: "dev_job_1",
      status: "pending",
      pickupLocation: { latitude: 37.7901, longitude: -122.4002 },
      dropoffLocation: { latitude: 37.7911, longitude: -122.4012 },
    } as any;

    return buildMapShellOverlayModel({
      activeJob: pendingJob,
      latestJob: null,
      jobsSyncState: { status: "ok" } as any,
      courierLocation: null,
      tracking: false,
      hasPermission: false,
    });
  }, []);

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

      if (action === "update_status" && nextStatus === "accepted") {
        // Claim the job (uses agreedFee=0 for demo)
        await claimJob(jobId, uid, 0);
        alert("Job claimed (dev)");
        return;
      }

      if (action === "update_status" && nextStatus) {
        await updateJobStatus(jobId, nextStatus as any, uid);
        alert("Job status updated (dev)");
        return;
      }

      if (action === "start_tracking") {
        alert("Starting tracking (dev)");
        return;
      }

      if (action === "request_location_permission") {
        alert("Please enable location permission in your browser (dev)");
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
        <div className="top-0 left-0 right-0 p-4">{/* top overlay slot */}</div>

        <div className="flex justify-center items-center mt-24">
          {/* center overlay slot */}
        </div>

        <div className="fixed bottom-6 left-0 right-0 flex justify-center p-4">
          {/* bottom overlay slot */}
        </div>

        {/* Children (pages) will render here and may opt-in to overlay slots via context in future work */}
        <div className="p-4 pointer-events-auto">{children}</div>

        {/* Simple visible overlay slots for testing & preview */}
        <div className="absolute top-20 right-6 w-80 space-y-4 pointer-events-auto">
          {/* Active overlay (uses overlay model from controller) */}
          <div data-testid="active-overlay" className="pointer-events-auto">
            <ActiveJobOverlay
              model={overlayModel}
              onPrimaryAction={handlePrimaryAction}
            />
          </div>

          {/* Settings overlay */}
          <div className="pointer-events-auto">
            <SettingsOverlay />
          </div>
        </div>
      </div>
    </div>
  );
}
