/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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
const alertSpy = vi.spyOn(global as any, 'alert').mockImplementation(() => {});

import MapShellScreen from "@/screens/MapShellScreen";
import { claimJob } from "@/lib/v2/jobs";
import { fireEvent, waitFor, within } from "@testing-library/react";

describe("MapShellScreen interactions", () => {
  it("invokes claimJob when Accept Job is clicked (dev) and handles error", async () => {
    render(<MapShellScreen />);

    const overlay = screen.getByTestId('active-overlay');
    const btn = within(overlay).getByRole('button', { name: /Accept Job/i });
    fireEvent.click(btn);

    // Handler should have been executed and shown an alert due to mocked failure
    await waitFor(() => expect((alertSpy as any).mock.calls.length).toBeGreaterThanOrEqual(1));
    alertSpy.mockRestore();
  });
});
