import React from "react";
import { MapboxMap } from "@/components/v2/MapboxMap";
import { useMemo } from "react";
import { buildMapShellOverlayModel } from "@/lib/mapShell/overlayController";
import ActiveJobOverlay from "@/components/mapShell/ActiveJobOverlay";
import SettingsOverlay from "@/components/mapShell/SettingsOverlay";

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

  return (
    <div
      className={`min-h-screen relative bg-[#F8F9FF] ${className}`}
      aria-label="MapShell"
    >
      {/* Map surface (background) */}
      <div className="absolute inset-0 z-0" role="region" aria-label="Map view">
        <MapboxMap />
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
              onPrimaryAction={(a) => console.log('primary action', a)}
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
