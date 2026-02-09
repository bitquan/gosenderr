/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

// Mock auth/job hooks to avoid loading state
vi.mock("@/hooks/v2/useAuthUser", () => ({
  useAuthUser: () => ({ uid: "test-uid", loading: false }),
}));
vi.mock("@/hooks/v2/useUserDoc", () => ({
  useUserDoc: () => ({
    userDoc: { courierProfile: { isOnline: true, vehicleType: "car" } },
    loading: false,
  }),
}));
vi.mock("@/hooks/v2/useOpenJobs", () => ({
  useOpenJobs: () => ({ jobs: [], loading: false }),
}));

import CourierDashboardMobile from "../page";

describe("CourierDashboardMobile", () => {
  it("shows Preview MapShell button in dev mode", () => {
    // Render with NODE_ENV not production
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    render(
      <MemoryRouter>
        <CourierDashboardMobile />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("preview-mapshell-button")).toBeTruthy();

    // restore
    process.env.NODE_ENV = prev;
  });
});
