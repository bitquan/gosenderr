import {
  buildMapShellOverlayModel,
  deriveMapShellState,
} from "../overlayController.ts";
import { describe, it, expect } from "vitest";

const baseSyncState = { status: "ok" } as const;

const pendingJob = {
  id: "job_1",
  status: "pending" as const,
  pickupLocation: { latitude: 37.7901, longitude: -122.4002 },
  dropoffLocation: { latitude: 37.7911, longitude: -122.4012 },
};

describe("mapShellOverlayController", () => {
  it("returns offline_reconnect when sync is degraded", () => {
    const state = deriveMapShellState({
      activeJob: pendingJob as any,
      latestJob: pendingJob as any,
      jobsSyncState: { status: "reconnecting" } as any,
      courierLocation: null,
      tracking: false,
    });

    expect(state).toBe("offline_reconnect");
  });

  it("returns offer state for pending jobs", () => {
    const state = deriveMapShellState({
      activeJob: pendingJob as any,
      latestJob: pendingJob as any,
      jobsSyncState: baseSyncState as any,
      courierLocation: null,
      tracking: false,
    });

    expect(state).toBe("offer");
  });

  it("returns arrived_pickup when courier is close to pickup", () => {
    const state = deriveMapShellState({
      activeJob: { ...pendingJob, status: "accepted" } as any,
      latestJob: pendingJob as any,
      jobsSyncState: baseSyncState as any,
      courierLocation: {
        latitude: 37.79011,
        longitude: -122.40021,
      },
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
      } as any,
      latestJob: pendingJob as any,
      jobsSyncState: baseSyncState as any,
      courierLocation: {
        latitude: 37.79111,
        longitude: -122.40121,
      },
      tracking: true,
    });

    expect(state).toBe("proof_required");
  });

  it("maps arrived_dropoff to delivered transition action", () => {
    const overlay = buildMapShellOverlayModel({
      activeJob: {
        ...pendingJob,
        status: "picked_up",
      } as any,
      latestJob: pendingJob as any,
      jobsSyncState: baseSyncState as any,
      courierLocation: {
        latitude: 37.79111,
        longitude: -122.40121,
      },
      tracking: true,
      hasPermission: true,
    });

    expect(overlay.state).toBe("arrived_dropoff");
    expect(overlay.primaryAction).toBe("update_status");
    expect(overlay.nextStatus).toBe("delivered");
  });
});
