import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "purple";
}

export function Skeleton({
  className,
  variant = "default",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        variant === "purple" ? "skeleton-purple" : "skeleton",
        "rounded-2xl",
        className,
      )}
      {...props}
    />
  );
}
