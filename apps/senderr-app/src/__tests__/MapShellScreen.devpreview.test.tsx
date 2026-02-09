/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MapShellScreen from "@/screens/MapShellScreen";

// Mock MapboxMap
vi.mock("@/components/v2/MapboxMap", () => ({
  MapboxMap: () => <div data-testid="map-placeholder">map</div>,
}));

describe("MapShellScreen dev preview", () => {
  it("shows dev banner and center overlay when devPreview=true", () => {
    render(<MapShellScreen devPreview={true} />);

    expect(screen.getByTestId("mapshell-dev-banner")).toBeTruthy();
    expect(screen.getByTestId("active-overlay-center")).toBeTruthy();
  });
});
