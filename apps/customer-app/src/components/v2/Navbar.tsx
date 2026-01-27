
import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { getAuthSafe } from "@/lib/firebase/auth";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useUserRole } from "@/hooks/v2/useUserRole";
import { Link } from "react-router-dom";
import { VENDOR_APP_URL } from '@/config/apps';

interface NavbarProps {
  children: ReactNode;
}

export function Navbar({ children }: NavbarProps) {
  const { user } = useAuthUser();
  const { role } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation(); const pathname = location.pathname;

  const handleSignOut = async () => {
    const auth = getAuthSafe();
    if (!auth) return;

    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // Don't show navbar on login/select-role pages (new design is now default)
  const hideNavbar = pathname === "/login" || pathname === "/select-role";

  if (hideNavbar) {
    return <>{children}</>;
  }

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <nav
        style={{
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "10px 12px",
          position: "sticky",
          top: 0,
          zIndex: 1000,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: "1400px",
            margin: "0 auto",
            gap: "20px",
          }}
        >
          {/* Logo */}
          <Link
            to="/marketplace"
            style={{
              fontSize: "16px",
              fontWeight: "700",
              color: "#6E56CF",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            GoSenderr
          </Link>

          {/* Role Badge */}
          {user && role && (
            role === 'vendor' ? (
              <a
                href={`${VENDOR_APP_URL}/vendor/items`}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                  color: 'white',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'inline-block',
                }}
                title={`Go to vendor dashboard`}
              >
                🏪 Market Senderr
              </a>
            ) : (
              <Link
                to={
                  role === 'admin'
                    ? '/admin/dashboard'
                    : role === 'customer'
                      ? '/dashboard'
                      : role === 'courier'
                        ? '/courier/dashboard'
                        : role === 'runner'
                          ? '/runner/dashboard'
                          : '/dashboard'
                }
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background:
                    role === 'admin'
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : role === 'customer'
                        ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                        : role === 'courier'
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : role === 'runner'
                            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            : '#6b7280',
                  color: 'white',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'inline-block',
                }}
              >
                {role === 'admin'
                  ? '👨‍💼 Admin'
                  : role === 'customer'
                    ? '👤 Order Up'
                    : role === 'courier'
                      ? '🚗 Senderr'
                      : role === 'runner'
                        ? '🚚 Shifter'
                        : role}
              </Link>
            )
          )}

          {/* Navigation Links - Responsive */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <Link
              to="/marketplace"
              style={{
                fontSize: "13px",
                fontWeight: pathname.startsWith("/marketplace") ? "600" : "400",
                color: pathname.startsWith("/marketplace") ? "#6E56CF" : "#666",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Marketplace
            </Link>

            {user && role === "vendor" && (
              <Link
                to="/marketplace/create"
                style={{
                  fontSize: "13px",
                  fontWeight:
                    pathname === "/marketplace/create" ? "600" : "400",
                  color:
                    pathname === "/marketplace/create" ? "#6E56CF" : "#666",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                + List Item
              </Link>
            )}

            {user && role && role !== "vendor" && (
              <Link
                to="/marketplace/create"
                style={{
                  fontSize: "13px",
                  fontWeight:
                    pathname === "/marketplace/create" ? "600" : "400",
                  color:
                    pathname === "/marketplace/create" ? "#6E56CF" : "#666",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                🏪 Become a Vendor
              </Link>
            )}

            {user && role === "customer" && (
              <Link
                to="/jobs"
                style={{
                  fontSize: "13px",
                  fontWeight: pathname.startsWith("/jobs") ? "600" : "400",
                  color: pathname.startsWith("/jobs") ? "#6E56CF" : "#666",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Jobs
              </Link>
            )}

            {user && role === "courier" && (
              <Link
                to="/courier/dashboard"
                style={{
                  fontSize: "13px",
                  fontWeight: pathname.startsWith("/courier") ? "600" : "400",
                  color: pathname.startsWith("/courier") ? "#6E56CF" : "#666",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Dashboard
              </Link>
            )}

            {user && role === "vendor" && (
              <a
                href={`${VENDOR_APP_URL}/vendor/items`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: "13px",
                  fontWeight: pathname.startsWith("/vendor") ? "600" : "400",
                  color: pathname.startsWith("/vendor") ? "#6E56CF" : "#666",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Items
              </a>
            )}

            {/* User Menu */}
            {user ? (
              <button
                onClick={handleSignOut}
                style={{
                  fontSize: "12px",
                  color: "#666",
                  background: "none",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  padding: "5px 10px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Sign Out
              </button>
            ) : (
              <Link
                to="/login"
                style={{
                  fontSize: "12px",
                  color: "white",
                  background: "#6E56CF",
                  textDecoration: "none",
                  borderRadius: "6px",
                  padding: "5px 10px",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                }}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
