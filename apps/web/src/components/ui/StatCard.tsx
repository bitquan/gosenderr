"use client";

import { ReactNode } from "react";
import { Card } from "./Card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    trend: "up" | "down";
  };
  icon?: ReactNode;
  variant?: "default" | "success" | "warning" | "purple";
  suffix?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  icon,
  variant = "default",
  suffix,
  className,
}: StatCardProps) {
  const variantStyles = {
    default: "from-blue-50 to-blue-100",
    success: "from-green-50 to-green-100",
    warning: "from-orange-50 to-orange-100",
    purple: "from-purple-50 to-purple-100",
  };

  const iconColors = {
    default: "text-blue-600",
    success: "text-green-600",
    warning: "text-orange-600",
    purple: "text-purple-600",
  };

  const textColors = {
    default: "text-blue-700",
    success: "text-green-700",
    warning: "text-orange-700",
    purple: "text-purple-700",
  };

  return (
    <Card
      className={cn(
        "bg-gradient-to-br",
        variantStyles[variant],
        "border-none",
        className,
      )}
      padding="md"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className={cn("text-4xl font-bold", textColors[variant])}>
              {value}
            </p>
            {suffix && <span className="text-lg text-gray-500">{suffix}</span>}
          </div>
          {change && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  "text-xs font-medium",
                  change.trend === "up" ? "text-green-600" : "text-red-600",
                )}
              >
                {change.trend === "up" ? "↑" : "↓"} {change.value}
              </span>
              <span className="text-xs text-gray-500">from last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn("text-5xl opacity-20", iconColors[variant])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  color?: "purple" | "blue" | "green" | "red";
  className?: string;
}

export function MetricCard({
  label,
  value,
  color = "purple",
  className,
}: MetricCardProps) {
  const colorStyles = {
    purple: "bg-gradient-to-br from-purple-500 to-purple-600",
    blue: "bg-gradient-to-br from-blue-500 to-blue-600",
    green: "bg-gradient-to-br from-green-500 to-green-600",
    red: "bg-gradient-to-br from-red-500 to-red-600",
  };

  return (
    <div
      className={cn(
        "rounded-2xl p-4 text-white",
        colorStyles[color],
        className,
      )}
    >
      <p className="text-sm opacity-90 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
