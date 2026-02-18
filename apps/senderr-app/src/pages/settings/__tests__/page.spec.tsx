/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, beforeEach, expect, vi } from "vitest";

// module-scoped mock state so tests can flip courierProfile returns per-case
let mockUserDoc: any = { courierProfile: { payoutMode: "token" } };

const _mockAuthUser = { user: { uid: "u1" }, loading: false };
vi.mock("@/hooks/v2/useAuthUser", () => ({
  useAuthUser: () => _mockAuthUser,
}));

vi.mock("firebase/firestore", async () => {
  const orig = await vi.importActual<any>("firebase/firestore");
  return {
    ...(orig as any),
    getDoc: async () => ({ exists: () => true, data: () => mockUserDoc }),
  };
});

vi.mock("@/lib/v2/jobs", () => ({
  getTokenWalletSummary: async () => ({ available: 5, reserved: 1 }),
  getTokenPolicy: async () => ({ enabled: true, packs: [{ id: "pack1", tokens: 10, priceUsd: 1 }] }),
  tokenCreateCheckoutSession: () => ({}),
}));

import CourierSettingsPage from "@/pages/settings/page";

describe("CourierSettingsPage — token wallet visibility & payoutMode parity", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUserDoc = { courierProfile: { payoutMode: "token" } };
  });

  it("shows token wallet when courier payoutMode is 'token'", async () => {
    render(
      <MemoryRouter>
        <CourierSettingsPage />
      </MemoryRouter>,
    );

    // Switch to the "Payouts" tab where token wallet UI lives
    // Wait for tabs to finish loading and show the Payouts tab
    const payoutsButtons = await screen.findAllByRole("button", { name: /Payouts/i });
    fireEvent.click(payoutsButtons[0]);

    // Wait for token wallet summary to render (verify available balance)
    await waitFor(() => expect(screen.getByText("5 tokens")).toBeTruthy());
    expect(screen.getByText("5 tokens")).toBeTruthy();
    expect(screen.getByText(/Start token checkout/i)).toBeTruthy();
  });

  it("hides token wallet UI when payoutMode is 'cash'", async () => {
    mockUserDoc = { courierProfile: { payoutMode: "cash" } };

    render(
      <MemoryRouter>
        <CourierSettingsPage />
      </MemoryRouter>,
    );

    // Ensure Payouts tab is visible then switch to it
    const payoutsButtons = await screen.findAllByRole("button", { name: /Payouts/i });
    fireEvent.click(payoutsButtons[0]);

    // wait for the Payouts section to render
    await screen.findByText(/Taxes & Payouts/i);

    // locate the Payout Mode select by finding the combobox that contains the
    // 'Token wallet mode' option (robust when labels aren't programmatically tied)
    const selects = screen.getAllByRole('combobox');
    const payoutSelect = selects.find((s) => {
      try {
        return Array.from(s.querySelectorAll('option')).some(o => /Token wallet mode/i.test(o.textContent || ''));
      } catch (e) {
        return false;
      }
    });

    // force the UI into 'cash' mode to validate the hide behavior (robust vs mocked doc state)
    expect(payoutSelect).toBeDefined();
    fireEvent.change(payoutSelect!, { target: { value: 'cash' } });
    expect((payoutSelect as HTMLSelectElement).value).toBe('cash');

    // Token wallet UI must not be present after switching to cash
    expect(screen.queryByText("5 tokens")).toBeNull();
    expect(screen.queryByText(/Start token checkout/i)).toBeNull();
  });
});
