import { HTMLAttributes } from "react";
import { cn } from "../lib/utils";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "purple";
}

export function Skeleton({
  className,
  variant = "default",
  ...props
}: SkeletonProps) {
  const variantClass = variant === "purple" 
    ? "animate-pulse bg-purple-200" 
    : "animate-pulse bg-gray-200";

  return (
    <div
      className={cn(
        variantClass,
        "rounded-2xl",
        className,
      )}
      {...props}
    />
  );
}
