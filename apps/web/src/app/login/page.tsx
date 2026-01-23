"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useUserRole } from "@/hooks/v2/useUserRole";
import Link from "next/link";

type RoleTab = "customer" | "driver" | "runner" | "vendor";

export default function V2Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleTab>("customer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const { role, loading: roleLoading } = useUserRole();
  const [hasRedirected, setHasRedirected] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log("🔍 [Login Debug] State:", {
      user: user?.email,
      uid: user?.uid,
      role,
      authLoading,
      roleLoading,
      hasRedirected,
    });
  }, [user, role, authLoading, roleLoading, hasRedirected]);

  // If already signed in, redirect based on role
  useEffect(() => {
    if (!authLoading && !roleLoading && user && role && !hasRedirected) {
      console.log("✅ [Login] Redirecting user with role:", role);
      setHasRedirected(true);
      if (role === "customer" || role === "buyer") {
        console.log("→ Redirecting to /customer/dashboard");
        router.push("/customer/dashboard");
      } else if (role === "courier") {
        console.log("→ Redirecting to /courier/dashboard");
        router.push("/courier/dashboard");
      } else if (role === "admin") {
        console.log("→ Redirecting to /admin/dashboard");
        router.push("/admin/dashboard");
      } else if (role === "runner") {
        console.log("→ Redirecting to /runner/dashboard");
        router.push("/runner/dashboard");
      } else if (role === "vendor" || role === "seller") {
        console.log("→ Redirecting to /vendor/items");
        router.push("/vendor/items");
      }
    } else if (
      !authLoading &&
      !roleLoading &&
      user &&
      !role &&
      !hasRedirected
    ) {
      // User exists but no role set
      console.log("⚠️ [Login] User has no role, redirecting to /select-role");
      setHasRedirected(true);
      router.push("/select-role");
    }
  }, [user, authLoading, role, roleLoading, router, hasRedirected]);

  const getRoleConfig = (role: RoleTab) => {
    const configs = {
      customer: {
        label: "Order Up",
        icon: "👤",
        color: "#3b82f6",
        gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
        description: "Send packages and request deliveries",
      },
      driver: {
        label: "Senderr",
        icon: "🚗",
        color: "#10b981",
        gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        description: "Deliver packages locally",
      },
      runner: {
        label: "Shifter",
        icon: "🚚",
        color: "#f59e0b",
        gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        description: "Long-haul package delivery",
      },
      vendor: {
        label: "Market Senderr",
        icon: "🏪",
        color: "#ec4899",
        gradient: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
        description: "Sell products on marketplace",
      },
    };
    return configs[role];
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const auth = getAuthSafe();
    if (!auth) {
      setError("Authentication not available");
      setLoading(false);
      return;
    }

    try {
      // Try to sign in first
      console.log("🔑 [Login] Attempting sign in for:", email);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      console.log(
        "✅ [Login] Sign in successful, UID:",
        userCredential.user.uid,
      );

      // Check if user has the selected role
      console.log("📄 [Login] Fetching user document...");
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data();
      console.log("📄 [Login] User document data:", userData);

      // Sync email if missing
      if (!userData?.email && userCredential.user.email) {
        console.log(
          "📧 [Login] Syncing email to Firestore:",
          userCredential.user.email,
        );
        await updateDoc(userDocRef, {
          email: userCredential.user.email,
          updatedAt: serverTimestamp(),
        });
      }

      // Map selected tab to actual role
      const selectedRoleMapping =
        selectedRole === "driver" ? "courier" : selectedRole;

      if (userData?.role) {
        // User has a role - validate it matches the selected tab
        const userRole = userData.role;

        console.log("🎭 [Login] Role check:", {
          userRole,
          selectedRole,
          selectedRoleMapping,
          match: userRole === selectedRoleMapping,
        });

        // Special handling for package_runner - redirect directly
        if (userRole === "package_runner") {
          console.log(
            "🚚 [Login] Package runner detected, redirecting to runner dashboard",
          );
          router.push("/runner/dashboard");
          return;
        }

        // Check if role matches selected tab
        if (userRole !== selectedRoleMapping) {
          const config = getRoleConfig(selectedRole);
          console.log("❌ [Login] Role mismatch!");
          setError(
            `You don't have ${config.label} access. Your role is: ${userRole}. Please select the correct role tab.`,
          );
          setLoading(false);
          return;
        }
      } else {
        // No role exists - create user document with selected role
        console.log(
          "📝 [Login] No role found, creating user document with role:",
          selectedRoleMapping,
        );
        await setDoc(userDocRef, {
          role: selectedRoleMapping,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log(
          "✅ [Login] User document created with role:",
          selectedRoleMapping,
        );
      }

      // Redirect based on selected role
      console.log("✅ [Login] Role validated, redirecting to dashboard...");
      setHasRedirected(true);

      if (selectedRoleMapping === "customer") {
        console.log("→ [Login] Redirecting to /customer/dashboard");
        router.push("/customer/dashboard");
      } else if (selectedRoleMapping === "courier") {
        console.log("→ [Login] Redirecting to /courier/dashboard");
        router.push("/courier/dashboard");
      } else if (selectedRoleMapping === "runner") {
        console.log("→ [Login] Redirecting to /runner/dashboard");
        router.push("/runner/dashboard");
      } else if (selectedRoleMapping === "vendor") {
        console.log("→ [Login] Redirecting to /vendor/items");
        router.push("/vendor/items");
      } else {
        console.log("→ [Login] Default redirect to /customer/dashboard");
        router.push("/customer/dashboard");
      }
    } catch (err: any) {
      console.error("❌ [Login] Error during sign in:", err);
      // If user not found, create account
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        try {
          console.log("🆕 [Login] Creating new account...");
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password,
          );
          console.log(
            "✅ [Login] Account created, UID:",
            userCredential.user.uid,
          );

          // Map selected role to actual role
          const actualRole =
            selectedRole === "driver" ? "courier" : selectedRole;

          // Create user document with selected role
          console.log(
            "📝 [Login] Creating user document with role:",
            actualRole,
          );
          const userRef = doc(db, "users", userCredential.user.uid);
          await setDoc(userRef, {
            role: actualRole,
            email: userCredential.user.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          console.log(
            "✅ [Login] User document created, redirecting to dashboard...",
          );
          setHasRedirected(true);

          // Redirect based on selected role
          if (actualRole === "customer") {
            router.push("/customer/dashboard");
          } else if (actualRole === "courier") {
            router.push("/courier/dashboard");
          } else if (actualRole === "runner") {
            router.push("/runner/dashboard");
          } else if (actualRole === "vendor") {
            router.push("/vendor/items");
          } else {
            router.push("/customer/dashboard");
          }
        } catch (createErr: any) {
          console.error("❌ [Login] Failed to create account:", createErr);
          setError(createErr.message || "Failed to create account");
          setLoading(false);
        }
      } else {
        setError(err.message || "Authentication failed");
        setLoading(false);
      }
    }
  };

  if (authLoading) {
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (user) {
    return null;
  }

  const roleConfig = getRoleConfig(selectedRole);
  const roles: RoleTab[] = ["customer", "driver", "runner", "vendor"];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          maxWidth: "480px",
          width: "100%",
          overflow: "hidden",
        }}
      >
        {/* Header with Logo */}
        <div
          style={{
            background: roleConfig.gradient,
            padding: "40px 30px",
            textAlign: "center",
            color: "white",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "10px" }}>🚚</div>
          <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "700" }}>
            GoSenderr
          </h1>
          <p style={{ margin: "8px 0 0", opacity: 0.9, fontSize: "14px" }}>
            {roleConfig.description}
          </p>
        </div>

        {/* Role Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "2px solid #f0f0f0",
            background: "#fafafa",
          }}
        >
          {roles.map((role) => {
            const config = getRoleConfig(role);
            const isActive = selectedRole === role;
            return (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                style={{
                  flex: 1,
                  padding: "16px 8px",
                  border: "none",
                  background: isActive ? "white" : "transparent",
                  borderBottom: isActive
                    ? `3px solid ${config.color}`
                    : "3px solid transparent",
                  cursor: "pointer",
                  fontSize: "20px",
                  transition: "all 0.2s",
                  position: "relative",
                  top: isActive ? "0" : "0",
                  fontWeight: isActive ? "600" : "400",
                  color: isActive ? config.color : "#666",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "4px" }}>
                  {config.icon}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {config.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Login Form */}
        <div style={{ padding: "40px 30px" }}>
          <h2
            style={{
              marginTop: 0,
              marginBottom: "8px",
              fontSize: "24px",
              color: "#1a1a1a",
            }}
          >
            Sign In as {roleConfig.icon} {roleConfig.label}
          </h2>
          <p style={{ color: "#666", marginBottom: "30px", fontSize: "14px" }}>
            Sign in or create an account with email and password
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "14px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "16px",
                  transition: "border-color 0.2s",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = roleConfig.color)}
                onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: "100%",
                  padding: "14px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "16px",
                  transition: "border-color 0.2s",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = roleConfig.color)}
                onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: "14px",
                  marginBottom: "20px",
                  background: "#fee2e2",
                  border: "2px solid #fca5a5",
                  borderRadius: "10px",
                  color: "#dc2626",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
                background: loading ? "#d1d5db" : roleConfig.gradient,
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "18px",
                fontWeight: "700",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading
                  ? "none"
                  : `0 4px 12px ${roleConfig.color}40`,
                transition: "all 0.2s",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {loading ? "Processing..." : "Continue"}
            </button>
          </form>

          <p
            style={{
              marginTop: "24px",
              textAlign: "center",
              color: "#999",
              fontSize: "12px",
            }}
          >
            Wrong role? Select the correct tab above
          </p>

          {/* Admin Login Link */}
          <div
            style={{
              marginTop: "30px",
              paddingTop: "20px",
              borderTop: "1px solid #f0f0f0",
              textAlign: "center",
            }}
          >
            <Link
              href="/admin-login"
              style={{
                display: "inline-block",
                padding: "8px 16px",
                background: "transparent",
                color: "#8b5cf6",
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: "500",
                borderRadius: "6px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f3e8ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              🔐 Admin Access
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
