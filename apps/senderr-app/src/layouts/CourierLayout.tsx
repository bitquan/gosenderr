import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { debugLogger } from "../utils/debugLogger";
import { useEffect, useMemo, useState } from "react";
import { useCourierLocationWriter } from "../hooks/v2/useCourierLocationWriter";

const courierOverlayItems = [
  { icon: "🗺️", label: "Map Shell", href: "/dashboard" },
  { icon: "📦", label: "Jobs", href: "/jobs" },
  { icon: "💰", label: "Earnings", href: "/earnings" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
  { icon: "❓", label: "Support", href: "/support" },
];

export default function CourierLayout() {
  debugLogger.log("render", "CourierLayout render start");
  const location = useLocation();
  const navigate = useNavigate();
  const [overlayOpen, setOverlayOpen] = useState(false);

  useCourierLocationWriter();

  const activePath = location.pathname;

  const isMapShellRoute = useMemo(
    () => activePath === "/dashboard" || activePath === "/map-shell",
    [activePath],
  );

  useEffect(() => {
    debugLogger.log("render", "CourierLayout mounted with floating overlay navigation");
  }, []);

  useEffect(() => {
    setOverlayOpen(false);
  }, [activePath]);

  return (
    <div className={`min-h-screen relative ${isMapShellRoute ? "bg-black" : "bg-[#F8F9FF]"}`}>
      <main className="min-w-0">
        <Outlet />
      </main>

      <div
        className={`fixed left-0 z-50 pointer-events-auto flex items-start ${
          isMapShellRoute ? "top-32" : "top-28"
        }`}
      >
        {overlayOpen && (
          <div className="ml-2 w-64 rounded-2xl border border-white/10 bg-slate-950/90 backdrop-blur shadow-2xl overflow-hidden text-white">
            <div className="px-4 py-3 border-b border-white/20 bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 text-white">
              <p className="text-xs uppercase tracking-wide text-blue-100">Senderr</p>
              <p className="text-sm font-semibold text-white">Courier Navigation</p>
            </div>

            <nav className="p-2 space-y-1">
              {courierOverlayItems.map((item) => {
                const isActive =
                  activePath === item.href || activePath.startsWith(`${item.href}/`);

                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? "bg-gradient-to-br from-slate-900 via-purple-900 to-purple-950/90 text-white border border-white/10"
                        : "text-gray-200 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-lg leading-none">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        <button
          onClick={() => setOverlayOpen((prev) => !prev)}
          className="h-11 w-10 rounded-r-xl rounded-l-none bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 text-white shadow-lg border border-white/20 border-l-0"
          aria-label={overlayOpen ? "Close navigation overlay" : "Open navigation overlay"}
          title={overlayOpen ? "Close navigation" : "Open navigation"}
        >
          {overlayOpen ? "✕" : "☰"}
        </button>
      </div>

    </div>
  );
}
