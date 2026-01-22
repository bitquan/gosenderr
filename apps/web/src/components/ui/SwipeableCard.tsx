"use client";

import { ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SwipeableCardProps {
  children: ReactNode;
  className?: string;
  maxSwipe?: number;
}

export function SwipeableCard({
  children,
  className,
  maxSwipe = 72,
}: SwipeableCardProps) {
  const startX = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    startX.current = event.clientX;
    setDragging(true);
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || startX.current === null) return;
    const delta = event.clientX - startX.current;
    const clamped = Math.max(-maxSwipe, Math.min(maxSwipe, delta));
    setOffset(clamped);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    setOffset(0);
    startX.current = null;
    (event.currentTarget as HTMLDivElement).releasePointerCapture(
      event.pointerId,
    );
  };

  return (
    <div
      className={cn(
        "touch-pan-y",
        dragging ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
      style={{
        transform: `translateX(${offset}px)`,
        transition: dragging ? "none" : "transform 200ms ease",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      {children}
    </div>
  );
}
