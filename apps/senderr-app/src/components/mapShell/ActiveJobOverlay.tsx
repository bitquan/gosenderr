import React from "react";
import type { MapShellOverlayModel } from "@/lib/mapShell/overlayController";

export default function ActiveJobOverlay({
  model,
  onPrimaryAction,
}: {
  model: MapShellOverlayModel;
  onPrimaryAction?: (action: string, nextStatus?: string | null) => void;
}) {
  const toneClass =
    {
      neutral: "bg-white text-gray-900",
      warning: "bg-yellow-50 text-yellow-900",
      error: "bg-red-50 text-red-900",
      success: "bg-green-50 text-green-900",
    }[model.tone] ?? "bg-white";

  return (
    <div
      className={`rounded-lg p-4 shadow ${toneClass}`}
      role="region"
      aria-label="Active job overlay"
    >
      <h2 className="font-bold text-lg">{model.title}</h2>
      <p className="text-sm mt-1">{model.description}</p>
      <div className="mt-3 flex gap-2">
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded"
          onClick={() =>
            onPrimaryAction?.(model.primaryAction, model.nextStatus)
          }
        >
          {model.primaryLabel}
        </button>
      </div>
    </div>
  );
}
