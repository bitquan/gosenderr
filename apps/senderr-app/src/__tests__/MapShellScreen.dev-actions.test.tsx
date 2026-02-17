/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
} from "@testing-library/react";

// Mock MapboxMap to avoid DOM/mapbox dependency in unit tests
vi.mock("@/components/v2/MapboxMap", () => ({
  MapboxMap: () => {
    return <div data-testid="map-placeholder">map</div>;
  },
}));

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
const alertSpy = vi.spyOn(global as any, "alert").mockImplementation(() => {});

import MapShellScreen from "@/screens/MapShellScreen";
import { claimJob } from "@/lib/v2/jobs";

describe("MapShellScreen dev-mode actions", () => {
  it("does not call backend actions when devPreview is true", async () => {
    const { container } = render(<MapShellScreen devPreview={true} />);

    const overlay = within(container).getByTestId("active-overlay");
    const btn = within(overlay).getByRole("button", { name: /Accept Job/i });
    fireEvent.click(btn);

    await waitFor(() =>
      expect((alertSpy as any).mock.calls.length).toBeGreaterThanOrEqual(1),
    );

    // Claim should not be called in dev preview
    expect((claimJob as any).mock.calls.length).toBe(0);

    alertSpy.mockRestore();
  });
});
