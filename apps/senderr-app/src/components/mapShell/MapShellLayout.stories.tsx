import React from "react";
import MapShellLayout from "./MapShellLayout";
import { Slot } from "./slots";

export default { title: "MapShell/MapShellLayout", component: MapShellLayout };

export const Default = () => (
  <MapShellLayout>
    <Slot name="topRight">
      <div style={{ width: 240, padding: 12, background: "#fff" }}>
        Top right
      </div>
    </Slot>
    <Slot name="bottomRight">
      <div style={{ width: 120, padding: 8, background: "#fff" }}>BR</div>
    </Slot>
    <Slot name="center">
      <div style={{ padding: 8, background: "#fff" }}>Center</div>
    </Slot>
    <Slot name="bottom">
      <div style={{ padding: 8, background: "#fff" }}>Bottom</div>
    </Slot>
  </MapShellLayout>
);
