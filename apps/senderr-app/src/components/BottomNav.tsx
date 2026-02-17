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
  activeJobHref?: string | null;
  walletBalance?: number | null;
  showWallet?: boolean;
}

export function BottomNav({
  items,
  activeJobHref = null,
  walletBalance = null,
  showWallet = false,
}: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!navRef.current) return;
    const updateHeight = () => {
      const height = navRef.current?.getBoundingClientRect().height ?? 0;
      const safeReservedHeight = Math.max(height + 12, 120);
      document.documentElement.style.setProperty(
        "--bottom-nav-height",
        `${safeReservedHeight}px`,
      );
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(navRef.current);
    window.addEventListener("resize", updateHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
      document.documentElement.style.setProperty("--bottom-nav-height", "0px");
    };
  }, []);

  return (
    <nav
      data-bottom-nav="true"
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/15 bg-slate-950/95 text-white backdrop-blur"
      style={{
        pointerEvents: "auto",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "8px",
        touchAction: "manipulation",
        transform: "translateZ(0)",
      }}
    >
      <div className="max-w-lg mx-auto px-3 pb-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/90">
            {showWallet
              ? `Wallet ${walletBalance == null ? "—" : walletBalance.toLocaleString()}`
              : "Wallet hidden"}
          </div>
          <button
            type="button"
            onClick={() => navigate(activeJobHref || "/jobs")}
            onTouchStart={(event) => {
              event.preventDefault();
              navigate(activeJobHref || "/jobs");
            }}
            className="rounded-full bg-gradient-to-r from-[#6B4EFF] to-[#9D7FFF] px-4 py-2 text-xs font-semibold text-white shadow"
            style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
          >
            {activeJobHref ? "Resume active delivery" : "Open jobs"}
          </button>
        </div>

        <div className="flex items-stretch justify-around rounded-2xl border border-white/15 bg-white/5 p-1.5 min-h-[64px]">
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
                className={`flex flex-1 flex-col items-center justify-center gap-1 px-3 py-2.5 rounded-xl min-w-[68px] transition-colors duration-150 ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                <div className="relative">
                  <span className="text-xl">{item.icon}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium ${isActive ? "font-semibold" : ""}`}
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
