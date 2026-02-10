/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MapShellScreen from "@/screens/MapShellScreen";

// Mock MapboxMap
vi.mock("@/components/v2/MapboxMap", () => ({
  MapboxMap: () => <div data-testid="map-placeholder">map</div>,
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

describe("MapShellScreen dev preview", () => {
  it("shows dev banner and center overlay when devPreview=true", () => {
    render(<MapShellScreen devPreview={true} />);

    expect(screen.getByTestId("mapshell-dev-banner")).toBeTruthy();
    // Ensure top-right active overlay is present and visible on small screens
    expect(screen.getByTestId("active-overlay")).toBeTruthy();
  });
});
