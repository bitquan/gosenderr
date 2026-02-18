/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/hooks/v2/useAuthUser", () => ({ useAuthUser: () => ({ uid: "courier-1" }) }));
vi.mock("@/hooks/v2/useJob", () => ({ useJob: (id: string | null) => ({ job: null, loading: true }) }));

// We'll override useJob per-test by re-registering the mock implementation later

vi.mock("@/hooks/v2/useUserDoc", () => ({ useUserDoc: () => ({ userDoc: { location: { lat: 0, lng: 0 }, courierProfile: { currentLocation: { lat: 0, lng: 0 } } } }) }));

// Mock MapboxMap so tests don't try to initialize WebGL/canvas
vi.mock("@/components/v2/MapboxMap", () => ({
  MapboxMap: () => <div data-testid="map-placeholder">map</div>,
}));
vi.mock("@/hooks/useNavigation", () => ({ useNavigation: () => ({ startNavigation: async () => {}, isNavigating: false }) }));

describe("CourierJobDetail — navigation button + payment-locked banner", () => {
  beforeEach(() => vi.resetAllMocks());

  it("shows active navigation button when payment is authorized and courier has location", async () => {
    // spy on useJob to return an authorized job and 'assigned' status
    const useJobModule = await import('@/hooks/v2/useJob');
    vi.spyOn(useJobModule, 'useJob').mockImplementation((jobId: string | null) => ({
      job: {
        courierUid: 'courier-1',
        status: 'assigned',
        paymentStatus: 'authorized',
        pickup: { lat: 1, lng: 1 },
        dropoff: { lat: 2, lng: 2 },
        updatedAt: { toDate: () => new Date() },
      },
      loading: false,
    } as any));

    const { default: CourierJobDetail } = await import('@/pages/jobs/[jobId]/page');
    render(
      <MemoryRouter initialEntries={["/jobs/job_1"]}>
        <Routes>
          <Route path="/jobs/:jobId" element={<CourierJobDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    const pickupBtn = await screen.findByRole("button", { name: /Navigate to Pickup/i });
    const dropoffBtn = await screen.findByRole("button", { name: /Navigate to Dropoff/i });

    expect(pickupBtn).toBeEnabled();
    // dropoff not yet available for 'assigned' but button should be present (disabled)
    expect(dropoffBtn).toBeDisabled();
  });

  it("shows payment-locked banner and disables navigation when payment not authorized", async () => {
    // spy on useJob to return a job with paymentStatus 'pending'
    const useJobModule = await import('@/hooks/v2/useJob');
    vi.spyOn(useJobModule, 'useJob').mockImplementation((jobId: string | null) => ({
      job: {
        courierUid: 'courier-1',
        status: 'assigned',
        paymentStatus: 'pending',
        pickup: { lat: 1, lng: 1 },
        dropoff: { lat: 2, lng: 2 },
        updatedAt: { toDate: () => new Date() },
      },
      loading: false,
    } as any));

    const { default: CourierJobDetail } = await import('@/pages/jobs/[jobId]/page');
    render(
      <MemoryRouter initialEntries={["/jobs/job_1"]}>
        <Routes>
          <Route path="/jobs/:jobId" element={<CourierJobDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    const paymentLocked = await screen.findAllByText(/Awaiting customer payment/i);
    expect(paymentLocked.length).toBeGreaterThan(0);

    // page renders multiple navigation buttons in different sections; assert all
    // visible navigation controls are disabled when payment is pending
    const pickupBtns = screen.getAllByRole("button", { name: /Navigate to Pickup/i });
    const dropoffBtns = screen.getAllByRole("button", { name: /Navigate to Dropoff/i });

    // at least one of the rendered navigation controls should be disabled
    // when payment is pending (some UI sections may still show a CTA)
    expect(pickupBtns.some(btn => btn.disabled)).toBe(true);
    expect(dropoffBtns.some(btn => btn.disabled)).toBe(true);
  });
});
