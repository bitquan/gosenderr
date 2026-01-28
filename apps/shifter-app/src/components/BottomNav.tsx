import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

export interface NavItem {
  icon: ReactNode;
  label: string;
  href: string;
  badge?: number;
}

interface BottomNavProps {
  items: NavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur border-t border-orange-100 pb-safe">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-around px-2 py-3">
          {items.map((item, index) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={index}
                to={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[65px] transition-all duration-200 ease-out active:scale-95 ${
                  isActive
                    ? "bg-orange-50 text-orange-600 -translate-y-0.5"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
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
                  className={`text-xs font-medium ${isActive ? "font-semibold" : ""}`}
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

// Runner navigation items
export const runnerNavItems: NavItem[] = [
  { icon: "🏠", label: "Home", href: "/dashboard" },
  { icon: "🛣️", label: "Routes", href: "/available-routes" },
  { icon: "📦", label: "Jobs", href: "/jobs" },
  { icon: "💰", label: "Earnings", href: "/earnings" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
];

// Customer navigation items
export const customerNavItems: NavItem[] = [
  { icon: "🏠", label: "Home", href: "/dashboard" },
  { icon: "📋", label: "Jobs", href: "/jobs" },
  { icon: "🚚", label: "Request", href: "/request-delivery" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
];
