import React from "react";

export type MapShellScreenProps = {
  className?: string;
};

export default function MapShellScreen({
  className = "",
}: MapShellScreenProps) {
  return (
    <div
      className={`min-h-screen bg-[#F8F9FF] ${className}`}
      aria-label="MapShell"
    >
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6">
        <h1 className="text-2xl font-bold">Map Shell (Preview)</h1>
        <p className="text-sm text-gray-500">
          Map-first courier experience scaffold
        </p>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <section
            className="lg:col-span-8 bg-gray-100 rounded-lg h-[60vh] p-4"
            role="region"
            aria-label="Map view"
          >
            {/* Map container placeholder (replace with Mapbox surface later) */}
            <div className="w-full h-full bg-white rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
              Map area (Mapbox)
            </div>
          </section>

          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-lg p-4 shadow">
              Overlay slot — Active Job
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              Overlay slot — Upcoming
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              Overlay slot — Settings
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
