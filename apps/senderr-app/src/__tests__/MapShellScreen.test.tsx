/// <reference types="vitest" />
import React from "react";
import { render, screen } from "@testing-library/react";
import MapShellScreen from "../screens/MapShellScreen";

describe("MapShellScreen", () => {
  it("renders map area and overlay slots", () => {
    render(<MapShellScreen />);
    expect(screen.getByLabelText("Map view")).toBeInTheDocument();
    expect(screen.getByText(/Overlay slot — Active Job/i)).toBeInTheDocument();
  });
});
