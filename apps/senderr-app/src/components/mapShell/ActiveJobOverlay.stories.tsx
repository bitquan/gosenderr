import React from "react";
import ActiveJobOverlay from "./ActiveJobOverlay";
import { buildMapShellOverlayModel } from "@/lib/mapShell/overlayController";
import type { JobsSyncState, Job } from "@/lib/mapShell/overlayController";

export default {
  title: "MapShell/ActiveJobOverlay",
  component: ActiveJobOverlay,
};

export const Offer = () => {
  const model = buildMapShellOverlayModel({
    activeJob: { id: "1", status: "pending" } as Job,
    latestJob: null,
    jobsSyncState: { status: "ok" } as JobsSyncState,
    courierLocation: null,
    tracking: false,
    hasPermission: false,
  });
  return <ActiveJobOverlay model={model} onPrimaryAction={() => {}} />;
};

export const Accepted_NoPermission = () => {
  const model = buildMapShellOverlayModel({
    activeJob: { id: "1", status: "accepted" } as Job,
    latestJob: null,
    jobsSyncState: { status: "ok" } as JobsSyncState,
    courierLocation: null,
    tracking: false,
    hasPermission: false,
  });
  return <ActiveJobOverlay model={model} onPrimaryAction={() => {}} />;
};

export const Accepted_WithPermission = () => {
  const model = buildMapShellOverlayModel({
    activeJob: { id: "1", status: "accepted" } as Job,
    latestJob: null,
    jobsSyncState: { status: "ok" } as JobsSyncState,
    courierLocation: null,
    tracking: true,
    hasPermission: true,
  });
  return <ActiveJobOverlay model={model} onPrimaryAction={() => {}} />;
};
