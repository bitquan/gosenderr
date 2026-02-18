import React from "react";
import ActiveJobOverlay from "./ActiveJobOverlay";
import { buildMapShellOverlayModel } from "@/lib/mapShell/overlayController";
<<<<<<< HEAD
=======
import type { JobsSyncState, Job } from "@/lib/mapShell/overlayController";
>>>>>>> senderr_app

export default {
  title: "MapShell/ActiveJobOverlay",
  component: ActiveJobOverlay,
};

export const Offer = () => {
  const model = buildMapShellOverlayModel({
<<<<<<< HEAD
    activeJob: { id: "1", status: "pending" } as any,
    latestJob: null,
    jobsSyncState: { status: "ok" } as any,
    courierLocation: null,
    tracking: false,
    hasPermission: false,
  } as any);
=======
    activeJob: { id: "1", status: "pending" } as Job,
    latestJob: null,
    jobsSyncState: { status: "ok" } as JobsSyncState,
    courierLocation: null,
    tracking: false,
    hasPermission: false,
  });
>>>>>>> senderr_app
  return <ActiveJobOverlay model={model} onPrimaryAction={() => {}} />;
};

export const Accepted_NoPermission = () => {
  const model = buildMapShellOverlayModel({
<<<<<<< HEAD
    activeJob: { id: "1", status: "accepted" } as any,
    latestJob: null,
    jobsSyncState: { status: "ok" } as any,
    courierLocation: null,
    tracking: false,
    hasPermission: false,
  } as any);
=======
    activeJob: { id: "1", status: "accepted" } as Job,
    latestJob: null,
    jobsSyncState: { status: "ok" } as JobsSyncState,
    courierLocation: null,
    tracking: false,
    hasPermission: false,
  });
>>>>>>> senderr_app
  return <ActiveJobOverlay model={model} onPrimaryAction={() => {}} />;
};

export const Accepted_WithPermission = () => {
  const model = buildMapShellOverlayModel({
<<<<<<< HEAD
    activeJob: { id: "1", status: "accepted" } as any,
    latestJob: null,
    jobsSyncState: { status: "ok" } as any,
    courierLocation: null,
    tracking: true,
    hasPermission: true,
  } as any);
=======
    activeJob: { id: "1", status: "accepted" } as Job,
    latestJob: null,
    jobsSyncState: { status: "ok" } as JobsSyncState,
    courierLocation: null,
    tracking: true,
    hasPermission: true,
  });
>>>>>>> senderr_app
  return <ActiveJobOverlay model={model} onPrimaryAction={() => {}} />;
};
