/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ActiveJobOverlay from "@/components/mapShell/ActiveJobOverlay";

const fakeModel = {
  state: 'offer',
  title: 'New job offer',
  description: 'Accept this job to start pickup workflow.',
  primaryLabel: 'Accept Job',
  primaryAction: 'update_status',
  nextStatus: 'accepted',
  tone: 'warning',
} as any;

describe('ActiveJobOverlay', () => {
  it('renders title and primary button', () => {
    render(<ActiveJobOverlay model={fakeModel} />);
    expect(screen.getByText('New job offer')).toBeTruthy();
    expect(screen.getByText('Accept Job')).toBeTruthy();
  });
});
