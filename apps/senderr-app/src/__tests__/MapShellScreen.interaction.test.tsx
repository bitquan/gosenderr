/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
<<<<<<< HEAD
import { render, screen } from "@testing-library/react";
=======
import { render } from "@testing-library/react";
>>>>>>> senderr_app

// Mock MapboxMap to avoid DOM/mapbox dependency in unit tests
vi.mock("@/components/v2/MapboxMap", () => ({
  MapboxMap: () => {
    return <div data-testid="map-placeholder">map</div>;
  },
}));

<<<<<<< HEAD
=======
vi.mock("@/hooks/v2/useOpenJobs", () => ({
  useOpenJobs: () => ({
    jobs: [
      {
        id: "job_1",
        status: "open",
        courierUid: null,
        pickup: { lat: 37.1, lng: -122.1 },
        dropoff: { lat: 37.2, lng: -122.2 },
      },
    ],
    loading: false,
    syncState: { status: "ok" },
  }),
}));

vi.mock("@/hooks/v2/useUserDoc", () => ({
  useUserDoc: () => ({ userDoc: null, loading: false }),
}));

vi.mock("@/hooks/v2/useCourierLocationWriter", () => ({
  useCourierLocationWriter: () => ({
    isTracking: false,
    permissionDenied: false,
  }),
}));

>>>>>>> senderr_app
// Mock jobs functions so we don't call real Firebase in tests
vi.mock("@/lib/v2/jobs", () => ({
  claimJob: vi.fn(async () => Promise.reject(new Error("not found"))),
  updateJobStatus: vi.fn(async () => Promise.resolve()),
}));

// Mock authenticated user so MapShell actions will proceed
vi.mock("@/hooks/v2/useAuthUser", () => ({
  useAuthUser: () => ({ uid: "test-uid", loading: false }),
}));

// Stub alert to avoid test dialog
<<<<<<< HEAD
const alertSpy = vi.spyOn(global as any, "alert").mockImplementation(() => {});

import MapShellScreen from "@/screens/MapShellScreen";
import { claimJob } from "@/lib/v2/jobs";
=======
const alertSpy = vi
  .spyOn(globalThis as unknown as Window, "alert")
  .mockImplementation(() => {});

import type { MapShellOverlayModel } from "@/lib/mapShell/overlayController";
import MapShellScreen from "@/screens/MapShellScreen";
>>>>>>> senderr_app
import { fireEvent, waitFor, within } from "@testing-library/react";

describe("MapShellScreen interactions", () => {
  it("invokes claimJob when Accept Job is clicked (dev) and handles error", async () => {
    const { container, unmount } = render(<MapShellScreen />);

    const overlay = within(container).getByTestId("active-overlay");
    const btn = within(overlay).getByRole("button", { name: /Accept Job/i });
    fireEvent.click(btn);

    // Handler should have been executed and shown an alert due to mocked failure
    await waitFor(() =>
<<<<<<< HEAD
      expect((alertSpy as any).mock.calls.length).toBeGreaterThanOrEqual(1),
    );
    await waitFor(() =>
      expect((claimJob as any).mock.calls.length).toBeGreaterThanOrEqual(1),
=======
      expect(alertSpy.mock.calls.length).toBeGreaterThanOrEqual(1),
>>>>>>> senderr_app
    );
    alertSpy.mockClear();

    // Unmount first render before subsequent renders to avoid duplicate nodes
    unmount();

    // Now simulate accepted state and request location permission failing
    const acceptedModel = {
      state: "accepted",
      title: "Job accepted",
      description: "Enable location",
      primaryLabel: "Enable Location",
      primaryAction: "request_location_permission",
      nextStatus: null,
      tone: "neutral",
<<<<<<< HEAD
    } as any;
=======
    } as unknown as MapShellOverlayModel;
>>>>>>> senderr_app

    const { container: c2, unmount: u2 } = render(
      <MapShellScreen devOverlayModel={acceptedModel} />,
    );
    const accOverlay = within(c2).getByTestId("active-overlay");
    const accBtn = within(accOverlay).getByRole("button", {
      name: /Enable Location/i,
    });

<<<<<<< HEAD
    // Mock permission failure
    (navigator as any).geolocation = {
      getCurrentPosition: (_s: any, err: any) =>
        err({ code: 1, message: "Permission denied" }),
    };

    fireEvent.click(accBtn);
    await waitFor(() =>
      expect((alertSpy as any).mock.calls.length).toBeGreaterThanOrEqual(1),
=======
    // Mock permission failure (typed)
    (navigator as unknown as { geolocation?: Geolocation }).geolocation = {
      getCurrentPosition: (_s: PositionCallback, err?: PositionErrorCallback) =>
        err?.({
          code: 1,
          message: "Permission denied",
        } as unknown as GeolocationPositionError),
    } as Geolocation;

    fireEvent.click(accBtn);
    await waitFor(() =>
      expect(alertSpy.mock.calls.length).toBeGreaterThanOrEqual(1),
>>>>>>> senderr_app
    );

    alertSpy.mockClear();

    u2();

    // Now simulate accepted state with permission granted
    const acceptedModel2 = {
      ...acceptedModel,
      primaryLabel: "Start Tracking",
      primaryAction: "start_tracking",
<<<<<<< HEAD
    } as any;
=======
    } as unknown as MapShellOverlayModel;
>>>>>>> senderr_app
    const { container: c3, unmount: u3 } = render(
      <MapShellScreen devOverlayModel={acceptedModel2} />,
    );
    const accOverlay2 = within(c3).getByTestId("active-overlay");
    const accBtn2 = within(accOverlay2).getByRole("button", {
      name: /Start Tracking/i,
    });

<<<<<<< HEAD
    (navigator as any).geolocation = {
      getCurrentPosition: (s: any) =>
        s({ coords: { latitude: 1, longitude: 2 } }),
    };

    fireEvent.click(accBtn2);
    await waitFor(() =>
      expect((alertSpy as any).mock.calls.length).toBeGreaterThanOrEqual(1),
=======
    (navigator as unknown as { geolocation?: Geolocation }).geolocation = {
      getCurrentPosition: (s: PositionCallback) =>
        s({
          coords: { latitude: 1, longitude: 2 },
        } as unknown as GeolocationPosition),
    } as Geolocation;

    fireEvent.click(accBtn2);
    await waitFor(() =>
      expect(alertSpy.mock.calls.length).toBeGreaterThanOrEqual(1),
>>>>>>> senderr_app
    );

    u3();

    alertSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
