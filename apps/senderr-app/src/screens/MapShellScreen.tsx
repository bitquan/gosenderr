import React from "react";
import { MapboxMap } from "@/components/v2/MapboxMap";

export type MapShellScreenProps = {
  className?: string;
  children?: React.ReactNode;
};

export default function MapShellScreen({
  className = "",
  children,
}: MapShellScreenProps) {
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

        <div className="flex justify-center items-center mt-24">{/* center overlay slot */}</div>

        <div className="fixed bottom-6 left-0 right-0 flex justify-center p-4">{/* bottom overlay slot */}</div>

        {/* Children (pages) will render here and may opt-in to overlay slots via context in future work */}
        <div className="p-4 pointer-events-auto">{children}</div>

        {/* Simple visible overlay slots for testing & preview */}
        <div className="absolute top-20 right-6 w-64 space-y-3 pointer-events-auto">
          <div className="bg-white rounded-lg p-3 shadow">Overlay slot — Active Job</div>
          <div className="bg-white rounded-lg p-3 shadow">Overlay slot — Upcoming</div>
          <div className="bg-white rounded-lg p-3 shadow">Overlay slot — Settings</div>
        </div>
      </div>
    </div>
  );
}
