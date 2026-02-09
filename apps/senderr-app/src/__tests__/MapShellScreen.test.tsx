import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MapShellScreen from "@/screens/MapShellScreen";

describe("MapShellScreen", () => {
  it("renders without crashing and shows children", () => {
    const { getByText } = render(
      <MapShellScreen>
        <div>child content</div>
      </MapShellScreen>,
    );

    expect(getByText("child content")).toBeTruthy();
  });
});
