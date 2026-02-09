import React from "react";
import { MapShellSlotsProvider, useSlots } from "./slots";

export default function MapShellLayout({ children }: { children?: React.ReactNode }) {
  return (
    <MapShellSlotsProvider>
      <div className="relative z-10 pointer-events-none">
        {children}
        <MapShellOverlayLayer />
      </div>
    </MapShellSlotsProvider>
  );
}

function MapShellOverlayLayer() {
  const { slots } = useSlots();
  return (
    <>
      <div className="absolute top-6 left-6 pointer-events-auto" data-testid="slot-top-left">
        {slots.topLeft}
      </div>

      <div className="absolute top-20 right-6 w-80 space-y-4 pointer-events-auto" data-testid="slot-top-right">
        {slots.topRight}
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-auto" data-testid="slot-center">
        {slots.center}
      </div>

      <div className="fixed bottom-6 left-0 right-0 flex justify-center p-4 pointer-events-auto" data-testid="slot-bottom">
        {slots.bottom}
      </div>
    </>
  );
}
