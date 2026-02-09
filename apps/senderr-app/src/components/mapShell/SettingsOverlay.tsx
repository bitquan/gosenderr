import React from "react";

export default function SettingsOverlay() {
  return (
    <div
      className="rounded-lg p-4 shadow bg-white"
      role="region"
      aria-label="MapShell settings overlay"
    >
      <h3 className="font-semibold">MapShell Settings</h3>
      <div className="text-sm mt-2">
        <p>• Toggle map routing</p>
        <p>• Toggle location sharing</p>
      </div>
    </div>
  );
}
