/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock MapboxMap to avoid DOM/mapbox dependency in unit tests
vi.mock("@/components/v2/MapboxMap", () => ({
  MapboxMap: () => {
    // Simple placeholder component
    return <div data-testid="map-placeholder">map</div>;
  },
}));

vi.mock("@/hooks/v2/useOpenJobs", () => ({
  useOpenJobs: () => ({
    jobs: [],
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

vi.mock("@/hooks/v2/useAuthUser", () => ({
  useAuthUser: () => ({ uid: null, loading: false }),
}));

import MapShellScreen from "@/screens/MapShellScreen";

describe("MapShellScreen", () => {
  it("renders without crashing and shows children and overlay slots", () => {
    render(
      <MapShellScreen devPreview={true}>
        <div>child content</div>
      </MapShellScreen>,
    );

    expect(screen.getByText("child content")).toBeTruthy();
    expect(screen.getByTestId("map-placeholder")).toBeTruthy();
    expect(screen.getByLabelText("Map view")).toBeTruthy();
    // Active overlay should be present (dev preview)
    expect(screen.getByTestId("active-overlay")).toBeTruthy();
    expect(screen.getByText(/New job offer/i)).toBeTruthy();
  });
});
