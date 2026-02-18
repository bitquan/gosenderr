import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect } from 'vitest';
import BottomDrawer from "@/components/v2/BottomDrawer";

const makeJob = (id: string) => ({
  id,
  status: "open",
  pickup: { label: "A", lat: 0, lng: 0 },
  dropoff: { label: "B", lat: 0, lng: 0 },
  agreedFee: 12.5,
});

describe("BottomDrawer", () => {
  test("renders offers tab and shows counts", () => {
    const availableJobs = [makeJob("j1")];
    render(
      <BottomDrawer
        availableJobs={availableJobs as any}
        activeJobs={[] as any}
        historyJobs={[] as any}
        activeJob={null as any}
        selectedJobId={null}
        setSelectedJobId={() => {}}
        acceptingJobId={null}
        decliningJobId={null}
        onAccept={() => {}}
        onDecline={() => {}}
        tokenClaimReadiness={null}
      />,
    );

    expect(screen.getByText(/Map Shell Queue/)).toBeTruthy();
    expect(screen.getByText(/Offers \(1\)/)).toBeTruthy();
  });

  test("tab switching works", () => {
    const availableJobs = [makeJob("j1")];
    const activeJobs = [makeJob("j2")];
    render(
      <BottomDrawer
        availableJobs={availableJobs as any}
        activeJobs={activeJobs as any}
        historyJobs={[] as any}
        activeJob={null as any}
        selectedJobId={null}
        setSelectedJobId={() => {}}
        acceptingJobId={null}
        decliningJobId={null}
        onAccept={() => {}}
        onDecline={() => {}}
        tokenClaimReadiness={null}
      />,
    );

    // switch to Active
    fireEvent.click(screen.getByText(/Active \(1\)/));
    expect(screen.getByText(/Open active job/)).toBeTruthy();

    // switch to History (empty)
    fireEvent.click(screen.getByText(/History \(0\)/));
    expect(screen.getByText(/No completed or cancelled jobs yet/)).toBeTruthy();
  });

  test("handle pointer toggles snap and map drag collapses drawer", () => {
    const availableJobs = [makeJob("j1")];
    // mock map instance
    const listeners: Record<string, Array<() => void>> = {};
    const map = {
      on: (evt: string, cb: () => void) => { (listeners[evt] ||= []).push(cb); },
      off: (evt: string, cb: () => void) => { listeners[evt] = (listeners[evt] || []).filter((fn) => fn !== cb); },
    } as any;

    const { getByTestId } = render(
      <BottomDrawer
        mapInstance={map}
        availableJobs={availableJobs as any}
        activeJobs={[] as any}
        historyJobs={[] as any}
        activeJob={null as any}
        selectedJobId={null}
        setSelectedJobId={() => {}}
        acceptingJobId={null}
        decliningJobId={null}
        onAccept={() => {}}
        onDecline={() => {}}
        tokenClaimReadiness={null}
      />,
    );

    const drawer = getByTestId("bottom-drawer");
    // default is mid (46vh)
    expect(drawer.style.height).toBe("46vh");

    const handle = getByTestId("drawer-handle");
    // simulate drag up (expand)
    fireEvent.pointerDown(handle, { clientY: 200 });
    fireEvent.pointerUp(handle, { clientY: 50 });
    expect(drawer.style.height).toBe("72vh");

    // simulate map drag -> collapse
    (listeners["dragstart"] || []).forEach((fn) => fn());
    expect(drawer.style.height).toBe("24vh");
  });

  test("shows top-up when tokenClaimReadiness prevents claim", () => {
    const job = makeJob("j1");
    const tokenClaimReadiness = { useTokenMode: true, canClaim: false, requiredTokens: 1, availableTokens: 0 } as any;

    render(
      <BottomDrawer
        availableJobs={[job] as any}
        activeJobs={[] as any}
        historyJobs={[] as any}
        activeJob={null as any}
        selectedJobId={job.id}
        setSelectedJobId={() => {}}
        acceptingJobId={null}
        decliningJobId={null}
        onAccept={() => {}}
        onDecline={() => {}}
        tokenClaimReadiness={tokenClaimReadiness}
      />,
    );

    expect(screen.getByText(/Top-up required/)).toBeTruthy();
    const claimBtn = screen.getByText(/Top-up required/).closest("button");
    expect(claimBtn).toBeDisabled();
  });
});
