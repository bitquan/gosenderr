import { ReactNode, useEffect, useRef } from "react";
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

  useEffect(() => {
    const handleGlobalPointer = (event: PointerEvent) => {
      const x = event.clientX;
      const y = event.clientY;
      const target = event.target as HTMLElement | null;
      const hit = document.elementFromPoint(x, y) as HTMLElement | null;

      console.log("🧭 Global tap", {
        x,
        y,
        targetTag: target?.tagName,
        targetClasses: target?.className,
        targetNavItem: target?.closest("[data-nav-item]")?.getAttribute("data-nav-item"),
        hitTag: hit?.tagName,
        hitClasses: hit?.className,
        hitNavItem: hit?.closest("[data-nav-item]")?.getAttribute("data-nav-item"),
      });

      const indicator = document.createElement("div");
      indicator.style.position = "fixed";
      indicator.style.left = `${x - 12}px`;
      indicator.style.top = `${y - 12}px`;
      indicator.style.width = "24px";
      indicator.style.height = "24px";
      indicator.style.borderRadius = "9999px";
      indicator.style.border = "2px solid #10b981";
      indicator.style.background = "rgba(16, 185, 129, 0.2)";
      indicator.style.zIndex = "9999";
      indicator.style.pointerEvents = "none";
      indicator.style.boxShadow = "0 0 8px rgba(16, 185, 129, 0.6)";
      document.body.appendChild(indicator);
      setTimeout(() => indicator.remove(), 300);
    };

    document.addEventListener("pointerdown", handleGlobalPointer, true);
    return () => document.removeEventListener("pointerdown", handleGlobalPointer, true);
  }, []);

  const logNavTap = (event: React.PointerEvent<HTMLDivElement | HTMLAnchorElement>) => {
    const x = event.clientX;
    const y = event.clientY;
    const target = event.target as HTMLElement | null;
    const hit = document.elementFromPoint(x, y) as HTMLElement | null;

    console.log("🔎 BottomNav tap", {
      x,
      y,
      targetTag: target?.tagName,
      targetClasses: target?.className,
      targetNavItem: target?.closest("[data-nav-item]")?.getAttribute("data-nav-item"),
      hitTag: hit?.tagName,
      hitClasses: hit?.className,
      hitNavItem: hit?.closest("[data-nav-item]")?.getAttribute("data-nav-item"),
    });
  };

  return (
    <nav
      data-bottom-nav="true"
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-t border-emerald-100"
      style={{
        pointerEvents: "auto",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)",
        paddingTop: "4px",
        touchAction: "manipulation",
      }}
      onPointerDown={logNavTap}
    >
      <div className="max-w-lg mx-auto">
        <div className="flex items-stretch justify-around px-2 py-1.5 min-h-[56px]">
          {items.map((item, index) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={index}
                to={item.href}
                data-nav-item={item.href}
                className={`flex flex-1 flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl min-w-[70px] transition-colors duration-150 ${
                  isActive
                    ? "bg-emerald-50 text-emerald-600"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                onPointerDown={logNavTap}
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

// Courier navigation items
export const courierNavItems: NavItem[] = [
  { icon: "🏠", label: "Dashboard", href: "/dashboard" },
  { icon: "📦", label: "Active", href: "/jobs" },
  { icon: "💰", label: "Earnings", href: "/earnings" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
];
