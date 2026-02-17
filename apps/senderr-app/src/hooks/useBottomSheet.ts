import { useEffect, useState, useCallback } from "react";

export type DrawerSnap = "collapsed" | "mid" | "expanded";

export function useBottomSheet(options?: { initialSnap?: DrawerSnap; initialTab?: "offers" | "active" | "history"; mapInstance?: any; }) {
  const { initialSnap = "mid", initialTab = "offers", mapInstance } = options || {};

  const [drawerTab, setDrawerTab] = useState<"offers" | "active" | "history">(initialTab);
  const [drawerSnap, setDrawerSnap] = useState<DrawerSnap>(initialSnap);
  const [isCompactScreen, setIsCompactScreen] = useState(() => typeof window !== "undefined" ? window.innerWidth < 640 : false);
  const [dragStartY, setDragStartY] = useState<number | null>(null);

  useEffect(() => {
    const onResize = () => setIsCompactScreen(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!mapInstance) return;
    const onMapDragStart = () => setDrawerSnap("collapsed");
    mapInstance.on && mapInstance.on("dragstart", onMapDragStart);
    return () => {
      mapInstance.off && mapInstance.off("dragstart", onMapDragStart);
    };
  }, [mapInstance]);

  const handlePointerDown = useCallback((clientY: number) => {
    setDragStartY(clientY);
  }, []);

  const handlePointerUp = useCallback((clientY: number) => {
    if (dragStartY === null) return;
    const deltaY = clientY - dragStartY;
    const threshold = 40;

    if (Math.abs(deltaY) < threshold) {
      setDrawerSnap((prev) => (prev === "collapsed" ? "mid" : prev === "mid" ? "expanded" : "mid"));
      setDragStartY(null);
      return;
    }

    if (deltaY > 0) {
      setDrawerSnap((prev) => (prev === "expanded" ? "mid" : "collapsed"));
    } else {
      setDrawerSnap((prev) => (prev === "collapsed" ? "mid" : "expanded"));
    }

    setDragStartY(null);
  }, [dragStartY]);

  const drawerHeights = isCompactScreen
    ? { collapsed: "20vh", mid: "38vh", expanded: "62vh" }
    : { collapsed: "24vh", mid: "46vh", expanded: "72vh" };

  return {
    drawerTab,
    setDrawerTab,
    drawerSnap,
    setDrawerSnap,
    isCompactScreen,
    handlePointerDown,
    handlePointerUp,
    drawerHeights,
  } as const;
}
