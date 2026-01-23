"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: ReactNode;
  label: string;
  href: string;
  badge?: number;
}

interface BottomNavProps {
  items: NavItem[];
  className?: string;
}

export function BottomNav({ items, className }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-white/90 backdrop-blur border-t border-purple-100",
        "pb-safe", // Safe area for mobile notches
        className,
      )}
    >
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-around px-2 py-3">
          {items.map((item, index) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-[70px]",
                  "transition-all duration-200 ease-out",
                  "active:scale-95",
                  isActive
                    ? "bg-purple-50 text-purple-600 -translate-y-0.5"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                )}
              >
                <div className="relative">
                  <span className="text-2xl">{item.icon}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    isActive ? "font-semibold" : "",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// Role-specific navigation configurations
export const customerNavItems: NavItem[] = [
  { icon: "🏠", label: "Home", href: "/customer/dashboard" },
  { icon: "📦", label: "Packages", href: "/customer/packages" },
  { icon: "🛒", label: "Orders", href: "/customer/orders" },
  { icon: "👤", label: "Profile", href: "/customer/profile" },
];

export const runnerNavItems: NavItem[] = [
  { icon: "🏠", label: "Home", href: "/runner/dashboard" },
  { icon: "🗺️", label: "Routes", href: "/runner/available-routes" },
  { icon: "💵", label: "Earnings", href: "/runner/earnings" },
  { icon: "👤", label: "Profile", href: "/runner/profile" },
];

export const adminNavItems: NavItem[] = [
  { icon: "🏠", label: "Home", href: "/admin/dashboard" },
  { icon: "👥", label: "Users", href: "/admin/users" },
  { icon: "🚚", label: "Runners", href: "/admin/runners" },
  { icon: "📦", label: "Packages", href: "/admin/packages" },
  { icon: "📊", label: "Analytics", href: "/admin/analytics" },
  { icon: "🚩", label: "Flags", href: "/admin/feature-flags" },
];
