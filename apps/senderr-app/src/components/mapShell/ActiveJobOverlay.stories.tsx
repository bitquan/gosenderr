import React from "react";
import ActiveJobOverlay from "./ActiveJobOverlay";
import { buildMapShellOverlayModel } from "@/lib/mapShell/overlayController";

export default {
  title: "MapShell/ActiveJobOverlay",
  component: ActiveJobOverlay,
};

export const Offer = () => {
  const model = buildMapShellOverlayModel({
    activeJob: { id: "1", status: "pending" } as any,
    latestJob: null,
    jobsSyncState: { status: "ok" } as any,
    courierLocation: null,
    tracking: false,
    hasPermission: false,
  } as any);
  return <ActiveJobOverlay model={model} onPrimaryAction={() => {}} />;
};

export const Accepted_NoPermission = () => {
  const model = buildMapShellOverlayModel({
    activeJob: { id: "1", status: "accepted" } as any,
    latestJob: null,
    jobsSyncState: { status: "ok" } as any,
    courierLocation: null,
    tracking: false,
    hasPermission: false,
  } as any);
  return <ActiveJobOverlay model={model} onPrimaryAction={() => {}} />;
};

export const Accepted_WithPermission = () => {
  const model = buildMapShellOverlayModel({
    activeJob: { id: "1", status: "accepted" } as any,
    latestJob: null,
    jobsSyncState: { status: "ok" } as any,
    courierLocation: null,
    tracking: true,
    hasPermission: true,
  } as any);
  return <ActiveJobOverlay model={model} onPrimaryAction={() => {}} />;
};
