
import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "purple";
  size?: "sm" | "md" | "lg";
}

export function Badge({
  children,
  variant = "default",
  size = "md",
  className,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-full transition-colors";

  const variantStyles = {
    default: "bg-gray-100 text-gray-700 border border-gray-200",
    success: "bg-green-50 text-green-700 border border-green-200",
    warning: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    error: "bg-red-50 text-red-700 border border-red-200",
    info: "bg-blue-50 text-blue-700 border border-blue-200",
    purple: "bg-purple-50 text-purple-700 border border-purple-200",
  };

  const sizeStyles = {
    sm: "text-xs px-2 py-0.5 h-5",
    md: "text-sm px-3 py-1 h-6",
    lg: "text-base px-4 py-1.5 h-8",
  };

  return (
    <span
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "active"
    | "completed"
    | "cancelled"
    | "in_progress"
    | "ready_for_pickup";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    pending: {
      variant: "warning" as const,
      label: "Pending",
    },
    approved: {
      variant: "success" as const,
      label: "Approved",
    },
    rejected: {
      variant: "error" as const,
      label: "Rejected",
    },
    active: {
      variant: "success" as const,
      label: "Active",
    },
    completed: {
      variant: "success" as const,
      label: "Completed",
    },
    cancelled: {
      variant: "error" as const,
      label: "Cancelled",
    },
    in_progress: {
      variant: "info" as const,
      label: "In Progress",
    },
    ready_for_pickup: {
      variant: "success" as const,
      label: "Ready",
    },
    pending_docs: {
      variant: "warning" as const,
      label: "Pending Documents",
    },
    pending_review: {
      variant: "warning" as const,
      label: "Pending Review",
    },
    suspended: {
      variant: "error" as const,
      label: "Suspended",
    },
    banned: {
      variant: "error" as const,
      label: "Banned",
    },
  };

  const config = statusConfig[status] || {
    variant: "default" as const,
    label: status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
  };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
