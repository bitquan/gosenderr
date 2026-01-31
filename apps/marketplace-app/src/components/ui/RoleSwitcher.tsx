import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/v2/useUserRole";
import { useAuthUser } from "@/hooks/v2/useAuthUser";

export function RoleSwitcher() {
  const navigate = useNavigate();
  const { uid } = useAuthUser();
  const { role } = useUserRole();
  const [isOpen, setIsOpen] = useState(false);

  // All logged-in users can access both customer and seller roles
  const roles = [
    { value: "customer", label: "Customer", icon: "👤", route: "/dashboard" },
    { value: "seller", label: "Seller", icon: "🏪", route: "/seller/dashboard" },
  ];

  const currentRole = roles.find((r) => r.value === role) || roles[0];

  const handleRoleSwitch = (route: string) => {
    setIsOpen(false);
    navigate(route);
  };

  if (!uid) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-sm hover:shadow-md transition-all border border-gray-200"
      >
        <span className="text-xl">{currentRole.icon}</span>
        <span className="font-medium text-gray-700">{currentRole.label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
            <div className="p-2">
              {roles.map((r) => (
                <button
                  key={r.value}
                  onClick={() => handleRoleSwitch(r.route)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    r.value === role
                      ? "bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <span className="text-2xl">{r.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{r.label}</div>
                    <div className="text-xs text-gray-500">
                      {r.value === "customer"
                        ? "Send & track packages"
                        : "Sell on marketplace"}
                    </div>
                  </div>
                  {r.value === role && (
                    <svg
                      className="w-5 h-5 text-purple-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 p-3 bg-gray-50">
              <p className="text-xs text-gray-600 text-center">
                Switch between your roles anytime
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
