"use client";

import { ButtonHTMLAttributes, ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

interface FloatingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "success";
  position?: "bottom-right" | "bottom-center";
  haptic?: boolean;
}

export function FloatingButton({
  icon,
  children,
  size = "lg",
  variant = "primary",
  position = "bottom-right",
  haptic = true,
  className,
  onClick,
  ...props
}: FloatingButtonProps) {
  const baseStyles =
    "fixed z-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center gap-2 font-medium";

  const sizeStyles = {
    sm: "w-12 h-12 text-sm",
    md: "w-14 h-14 text-base",
    lg: "w-16 h-16 text-lg",
  };

  const variantStyles = {
    primary:
      "bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white hover:from-[#5940CC] hover:to-[#8B6EE6]",
    secondary:
      "bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700",
    success:
      "bg-gradient-to-br from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700",
  };

  const positionStyles = {
    "bottom-right": "bottom-6 right-6",
    "bottom-center": "bottom-6 left-1/2 -translate-x-1/2",
  };

  // If there's both icon and children, make it pill-shaped
  const isExpanded = icon && children;

  const handleClick: ButtonHTMLAttributes<HTMLButtonElement>["onClick"] = (
    event,
  ) => {
    if (haptic && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
    onClick?.(event);
  };

  return (
    <button
      className={cn(
        baseStyles,
        isExpanded ? "rounded-full px-6" : sizeStyles[size],
        variantStyles[variant],
        positionStyles[position],
        className,
      )}
      {...props}
      onClick={handleClick}
    >
      {icon && <span className={isExpanded ? "" : "text-2xl"}>{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
}

interface FloatingActionMenuProps {
  trigger: ReactNode;
  actions: Array<{
    icon: ReactNode;
    label: string;
    onClick: () => void;
    variant?: "default" | "success" | "warning" | "error";
  }>;
}

export function FloatingActionMenu({
  trigger,
  actions,
}: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action Items */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 flex flex-col gap-3 mb-4 animate-slide-up">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 bg-white rounded-full shadow-lg px-4 py-3 hover:shadow-xl transition-all duration-300 hover:scale-105",
                "group",
              )}
            >
              <div className="text-xl">{action.icon}</div>
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-full bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white shadow-lg hover:shadow-xl transition-all duration-300",
          isOpen ? "rotate-45" : "rotate-0",
        )}
      >
        <span className="text-2xl">{isOpen ? "✕" : trigger}</span>
      </button>
    </div>
  );
}
