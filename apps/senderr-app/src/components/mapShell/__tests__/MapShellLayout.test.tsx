/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MapShellLayout from "@/components/mapShell/MapShellLayout";
import { Slot } from "@/components/mapShell/slots";

describe("MapShellLayout slots", () => {
  it("renders content into topRight slot", () => {
    const { container } = render(
      <MapShellLayout>
        <Slot name="topRight">
          <div data-testid="slot-top-content">Top content</div>
        </Slot>
      </MapShellLayout>,
    );

    // Scope to this render's container to avoid picking up other renders in the document
    const slotContainer = within(container).getByTestId("slot-top-right");
    expect(within(slotContainer).getByTestId("slot-top-content")).toBeTruthy();
  });

  it("renders center slot content", () => {
    const { container } = render(
      <MapShellLayout>
        <Slot name="center">
          <div data-testid="slot-center-content">Center</div>
        </Slot>
      </MapShellLayout>,
    );

    const slotContainer = within(container).getByTestId("slot-center");
    expect(within(slotContainer).getByTestId("slot-center-content")).toBeTruthy();
  });
});
