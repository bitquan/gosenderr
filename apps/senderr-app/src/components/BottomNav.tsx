import { ReactNode, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const pathname = location.pathname;
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!navRef.current) return;
    const updateHeight = () => {
      const height = navRef.current?.getBoundingClientRect().height ?? 0;
      document.documentElement.style.setProperty("--bottom-nav-height", `${height}px`);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(navRef.current);
    window.addEventListener("resize", updateHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  return (
    <nav
      data-bottom-nav="true"
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200"
      style={{
        pointerEvents: "auto",
        paddingBottom: "0px",
        paddingTop: "10px",
        height: "calc(80px + env(safe-area-inset-bottom))",
        touchAction: "manipulation",
        transform: "translateZ(0)",
      }}
    >
      <div
        className="max-w-lg mx-auto"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch justify-around px-2 py-2 min-h-[72px]">
          {items.map((item, index) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <button
                key={index}
                type="button"
                onClick={() => navigate(item.href)}
                onTouchStart={(event) => {
                  event.preventDefault();
                  navigate(item.href);
                }}
                data-nav-item={item.href}
                className={`flex flex-1 flex-col items-center justify-center gap-1.5 px-4 py-3.5 rounded-2xl min-w-[76px] min-h-[64px] transition-colors duration-150 ${
                  isActive
                    ? "bg-emerald-50 text-emerald-600"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
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
                  className={`text-[13px] font-medium ${isActive ? "font-semibold" : ""}`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// Courier navigation items
export const courierNavItems: NavItem[] = [
  { icon: "🏠", label: "Dashboard", href: "/dashboard" },
  { icon: "📦", label: "Jobs", href: "/jobs" },
  { icon: "💰", label: "Earnings", href: "/earnings" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
];
