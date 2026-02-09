/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Mock MapboxMap to avoid DOM/mapbox dependency in unit tests
vi.mock("@/components/v2/MapboxMap", () => ({
  MapboxMap: () => {
    // Simple placeholder component
    return <div data-testid="map-placeholder">map</div>;
  },
}));

import MapShellScreen from "@/screens/MapShellScreen";

describe("MapShellScreen", () => {
  it("renders without crashing and shows children", () => {
    const { getByText, getByTestId } = render(
      <MapShellScreen>
        <div>child content</div>
      </MapShellScreen>,
    );

    expect(getByText("child content")).toBeTruthy();
    expect(getByTestId("map-placeholder")).toBeTruthy();
  });
});
