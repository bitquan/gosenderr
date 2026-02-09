import React from "react";
import { MapboxMap } from "@/components/v2/MapboxMap";

export default function MapShellScreen({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative bg-white">
      {/* Map surface */}
      <div className="absolute inset-0 z-0">
        <MapboxMap />
      </div>

      {/* Overlay slots */}
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
      </div>
    </div>
  );
}
