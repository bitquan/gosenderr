import {
  buildMapShellOverlayModel,
  deriveMapShellState,
} from "../overlayController.ts";
<<<<<<< HEAD
=======
import type {
  Job,
  JobsSyncState,
  LocationSnapshot,
} from "../overlayController";
>>>>>>> senderr_app
import { describe, it, expect } from "vitest";

const baseSyncState = { status: "ok" } as const;

<<<<<<< HEAD
const pendingJob = {
  id: "job_1",
  status: "pending" as const,
=======
const pendingJob: Job = {
  id: "job_1",
  status: "pending",
>>>>>>> senderr_app
  pickupLocation: { latitude: 37.7901, longitude: -122.4002 },
  dropoffLocation: { latitude: 37.7911, longitude: -122.4012 },
};

describe("mapShellOverlayController", () => {
  it("returns offline_reconnect when sync is degraded", () => {
    const state = deriveMapShellState({
<<<<<<< HEAD
      activeJob: pendingJob as any,
      latestJob: pendingJob as any,
      jobsSyncState: { status: "reconnecting" } as any,
=======
      activeJob: pendingJob,
      latestJob: pendingJob,
      jobsSyncState: { status: "reconnecting" } as JobsSyncState,
>>>>>>> senderr_app
      courierLocation: null,
      tracking: false,
    });

    expect(state).toBe("offline_reconnect");
  });

  it("returns offer state for pending jobs", () => {
    const state = deriveMapShellState({
<<<<<<< HEAD
      activeJob: pendingJob as any,
      latestJob: pendingJob as any,
      jobsSyncState: baseSyncState as any,
=======
      activeJob: pendingJob,
      latestJob: pendingJob,
      jobsSyncState: baseSyncState as JobsSyncState,
>>>>>>> senderr_app
      courierLocation: null,
      tracking: false,
    });

    expect(state).toBe("offer");
  });

  it("returns arrived_pickup when courier is close to pickup", () => {
    const state = deriveMapShellState({
<<<<<<< HEAD
      activeJob: { ...pendingJob, status: "accepted" } as any,
      latestJob: pendingJob as any,
      jobsSyncState: baseSyncState as any,
      courierLocation: {
        latitude: 37.79011,
        longitude: -122.40021,
      },
=======
      activeJob: { ...pendingJob, status: "accepted" } as Job,
      latestJob: pendingJob,
      jobsSyncState: baseSyncState as JobsSyncState,
      courierLocation: {
        latitude: 37.79011,
        longitude: -122.40021,
      } as LocationSnapshot,
>>>>>>> senderr_app
      tracking: true,
    });

    expect(state).toBe("arrived_pickup");
  });

  it("returns proof_required when notes indicate proof near dropoff", () => {
    const state = deriveMapShellState({
      activeJob: {
        ...pendingJob,
        status: "picked_up",
        notes: "Photo proof required at dropoff",
<<<<<<< HEAD
      } as any,
      latestJob: pendingJob as any,
      jobsSyncState: baseSyncState as any,
      courierLocation: {
        latitude: 37.79111,
        longitude: -122.40121,
      },
=======
      } as Job,
      latestJob: pendingJob,
      jobsSyncState: baseSyncState as JobsSyncState,
      courierLocation: {
        latitude: 37.79111,
        longitude: -122.40121,
      } as LocationSnapshot,
>>>>>>> senderr_app
      tracking: true,
    });

    expect(state).toBe("proof_required");
  });

<<<<<<< HEAD
  it("maps arrived_dropoff to delivered transition action", () => {
=======
  it("maps arrived_dropoff to completed transition action", () => {
>>>>>>> senderr_app
    const overlay = buildMapShellOverlayModel({
      activeJob: {
        ...pendingJob,
        status: "picked_up",
<<<<<<< HEAD
      } as any,
      latestJob: pendingJob as any,
      jobsSyncState: baseSyncState as any,
      courierLocation: {
        latitude: 37.79111,
        longitude: -122.40121,
      },
=======
      } as Job,
      latestJob: pendingJob,
      jobsSyncState: baseSyncState as JobsSyncState,
      courierLocation: {
        latitude: 37.79111,
        longitude: -122.40121,
      } as LocationSnapshot,
>>>>>>> senderr_app
      tracking: true,
      hasPermission: true,
    });

    expect(overlay.state).toBe("arrived_dropoff");
    expect(overlay.primaryAction).toBe("update_status");
<<<<<<< HEAD
    expect(overlay.nextStatus).toBe("delivered");
=======
    expect(overlay.nextStatus).toBe("completed");
>>>>>>> senderr_app
  });
});
