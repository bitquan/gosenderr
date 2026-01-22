"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useUserRole } from "@/hooks/v2/useUserRole";
import Link from "next/link";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const { role, loading: roleLoading } = useUserRole();
  const [hasRedirected, setHasRedirected] = useState(false);

  // If already admin, redirect to admin dashboard
  useEffect(() => {
    if (
      !authLoading &&
      !roleLoading &&
      user &&
      role === "admin" &&
      !hasRedirected
    ) {
      console.log("✅ [Admin Login] Already logged in as admin, redirecting");
      setHasRedirected(true);
      router.push("/admin/dashboard");
    }
  }, [user, authLoading, role, roleLoading, router, hasRedirected]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const auth = getAuthSafe();
      if (!auth) {
        throw new Error("Auth not initialized");
      }

      console.log("🔑 [Admin Login] Attempting sign in for:", email);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      console.log(
        "✅ [Admin Login] Sign in successful, UID:",
        userCredential.user.uid,
      );

      // Check if user has admin role
      console.log("📄 [Admin Login] Checking admin privileges...");
      const userDocRef = doc(db, "users", userCredential.user.uid);
      console.log("📄 [Admin Login] Fetching user document from Firestore...");
      const userDoc = await getDoc(userDocRef);
      console.log("📄 [Admin Login] User doc exists:", userDoc.exists());

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("📄 [Admin Login] User data:", userData);
        console.log("📄 [Admin Login] User role:", userData?.role);

        if (userData?.role === "admin") {
          console.log("✅ [Admin Login] Admin access granted, redirecting...");
          setHasRedirected(true);
          router.push("/admin/dashboard");
        } else {
          console.log(
            "❌ [Admin Login] User role is not admin:",
            userData?.role,
          );
          setError(
            `Access denied. Your role is: ${userData?.role || "none"}. Admin privileges required.`,
          );
          setLoading(false);
          await auth.signOut();
        }
      } else {
        console.log("❌ [Admin Login] User document does not exist");
        setError(
          "Access denied. No user profile found. Please contact administrator.",
        );
        setLoading(false);
        await auth.signOut();
      }
    } catch (err: any) {
      console.error("❌ [Admin Login] Error:", err);
      if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password");
      } else if (err.code === "auth/user-not-found") {
        setError("No admin account found with this email");
      } else if (err.code === "auth/wrong-password") {
        setError("Invalid password");
      } else {
        setError(err.message || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (user && role === "admin") {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
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
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          maxWidth: "420px",
          width: "100%",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
            padding: "40px 30px",
            textAlign: "center",
            color: "white",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "10px" }}>🔐</div>
          <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "700" }}>
            Admin Portal
          </h1>
          <p style={{ margin: "8px 0 0", opacity: 0.9, fontSize: "14px" }}>
            System administration access
          </p>
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
            Admin Sign In
          </h2>
          <p style={{ color: "#666", marginBottom: "30px", fontSize: "14px" }}>
            Secure access for authorized administrators only
          </p>

          {error && (
            <div
              style={{
                background: "#fee",
                border: "1px solid #fcc",
                color: "#c33",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#333",
                  fontSize: "14px",
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@gosenderr.com"
                style={{
                  width: "100%",
                  padding: "14px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "16px",
                  transition: "border-color 0.2s",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#8b5cf6")}
                onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#333",
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
                placeholder="Enter admin password"
                style={{
                  width: "100%",
                  padding: "14px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "16px",
                  transition: "border-color 0.2s",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#8b5cf6")}
                onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
                background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
              }}
            >
              {loading ? "Signing In..." : "Sign In as Admin"}
            </button>
          </form>

          <div style={{ marginTop: "30px", textAlign: "center" }}>
            <Link
              href="/login"
              style={{
                color: "#8b5cf6",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              ← Back to Regular Login
            </Link>
          </div>

          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              background: "#fef3c7",
              borderRadius: "8px",
              fontSize: "13px",
              color: "#92400e",
            }}
          >
            <strong>⚠️ Security Notice:</strong> This portal is restricted to
            authorized administrators only. All access attempts are logged and
            monitored.
          </div>
        </div>
      </div>
    </div>
  );
}
