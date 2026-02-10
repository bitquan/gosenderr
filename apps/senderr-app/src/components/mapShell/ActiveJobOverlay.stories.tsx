import React from "react";
import ActiveJobOverlay from "./ActiveJobOverlay";
import { buildMapShellOverlayModel } from "@/lib/mapShell/overlayController";

export default {
  title: "MapShell/ActiveJobOverlay",
  component: ActiveJobOverlay,
};

export const Offer = () => {
  const model = buildMapShellOverlayModel({
    activeJob: { id: "1", status: "pending" } as unknown as { id: string; status: string },
    latestJob: null,
    jobsSyncState: { status: "ok" } as unknown as { status: string },
    courierLocation: null,
    tracking: false,
    hasPermission: false,
  });
  return <ActiveJobOverlay model={model} onPrimaryAction={() => {}} />;
};

export const Accepted_NoPermission = () => {
  const model = buildMapShellOverlayModel({
    activeJob: { id: "1", status: "accepted" } as unknown as { id: string; status: string },
    latestJob: null,
    jobsSyncState: { status: "ok" } as unknown as { status: string },
    courierLocation: null,
    tracking: false,
    hasPermission: false,
  });
  return <ActiveJobOverlay model={model} onPrimaryAction={() => {}} />;
};

export const Accepted_WithPermission = () => {
  const model = buildMapShellOverlayModel({
    activeJob: { id: "1", status: "accepted" } as unknown as { id: string; status: string },
    latestJob: null,
    jobsSyncState: { status: "ok" } as unknown as { status: string },
    courierLocation: null,
    tracking: true,
    hasPermission: true,
  });
  return <ActiveJobOverlay model={model} onPrimaryAction={() => {}} />;
};
