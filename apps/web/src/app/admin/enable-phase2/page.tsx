"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSafe } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export default function EnablePhase2Page() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("idle");
  const [currentFlags, setCurrentFlags] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      router.push("/admin-login");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/admin-login");
        return;
      }

      // Check if user is admin
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists() || userDoc.data()?.role !== "admin") {
          alert("Access denied. Admin privileges required.");
          router.push("/");
          return;
        }

        setIsAdmin(true);
        setAuthLoading(false);
        loadCurrentFlags();
      } catch (err) {
        console.error("Error checking admin status:", err);
        router.push("/admin-login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const loadCurrentFlags = async () => {
    try {
      const flagsRef = doc(db, "featureFlags", "config");
      const flagsDoc = await getDoc(flagsRef);

      if (flagsDoc.exists()) {
        setCurrentFlags(flagsDoc.data());
      } else {
        setCurrentFlags(null);
      }
    } catch (err: any) {
      console.error("Error loading flags:", err);
      setError(err.message);
    }
  };

  const enablePhase2 = async () => {
    setStatus("enabling");
    setError("");

    try {
      const flagsRef = doc(db, "featureFlags", "config");

      await updateDoc(flagsRef, {
        "customer.packageShipping": true,
        "delivery.routes": true,
        updatedAt: serverTimestamp(),
      });

      setStatus("success");
      await loadCurrentFlags();
    } catch (err: any) {
      console.error("Error enabling features:", err);
      setError(err.message);
      setStatus("error");
    }
  };

  if (authLoading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Verifying admin access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "20px" }}>
        🚀 Enable Phase 2 Features
      </h1>

      <div
        style={{
          background: "#f0f9ff",
          border: "2px solid #0ea5e9",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "30px",
        }}
      >
        <h2 style={{ fontSize: "20px", marginBottom: "10px" }}>
          Features to Enable:
        </h2>
        <ul style={{ marginLeft: "20px", lineHeight: "1.8" }}>
          <li>
            📦 <strong>Package Shipping</strong> - Customers can ship packages
            at /ship
          </li>
          <li>
            🚚 <strong>Courier Routes</strong> - Couriers can browse routes at
            /courier/routes
          </li>
        </ul>
      </div>

      {currentFlags && (
        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ fontSize: "18px", marginBottom: "10px" }}>
            Current Feature Flags:
          </h3>
          <pre
            style={{
              background: "#fff",
              padding: "15px",
              borderRadius: "8px",
              overflow: "auto",
              fontSize: "14px",
            }}
          >
            {JSON.stringify(currentFlags, null, 2)}
          </pre>
        </div>
      )}

      <button
        onClick={enablePhase2}
        disabled={status === "enabling"}
        style={{
          width: "100%",
          padding: "16px 32px",
          background:
            status === "enabling"
              ? "#d1d5db"
              : status === "success"
                ? "#10b981"
                : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          color: "white",
          border: "none",
          borderRadius: "12px",
          fontSize: "18px",
          fontWeight: "700",
          cursor: status === "enabling" ? "not-allowed" : "pointer",
          boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
          marginBottom: "20px",
        }}
      >
        {status === "idle" && "✨ Enable Phase 2 Features"}
        {status === "enabling" && "⏳ Enabling..."}
        {status === "success" && "✅ Features Enabled!"}
        {status === "error" && "❌ Error - Try Again"}
      </button>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            border: "2px solid #fca5a5",
            borderRadius: "12px",
            padding: "15px",
            color: "#dc2626",
            marginBottom: "20px",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {status === "success" && (
        <div
          style={{
            background: "#d1fae5",
            border: "2px solid #6ee7b7",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <h3
            style={{ fontSize: "18px", marginBottom: "10px", color: "#047857" }}
          >
            🎉 Phase 2 Features Enabled!
          </h3>
          <p style={{ marginBottom: "15px", color: "#065f46" }}>
            The following pages are now accessible:
          </p>
          <ul
            style={{ marginLeft: "20px", lineHeight: "1.8", color: "#065f46" }}
          >
            <li>
              <a
                href="/ship"
                style={{ color: "#0369a1", textDecoration: "underline" }}
              >
                /ship
              </a>{" "}
              - Package Shipping
            </li>
            <li>
              <a
                href="/courier/routes"
                style={{ color: "#0369a1", textDecoration: "underline" }}
              >
                /courier/routes
              </a>{" "}
              - Courier Routes
            </li>
            <li>
              <a
                href="/admin/feature-flags"
                style={{ color: "#0369a1", textDecoration: "underline" }}
              >
                /admin/feature-flags
              </a>{" "}
              - Feature Flags Admin
            </li>
          </ul>
        </div>
      )}

      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          background: "#fef3c7",
          borderRadius: "12px",
        }}
      >
        <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>
          💡 Next Steps:
        </h3>
        <ol style={{ marginLeft: "20px", lineHeight: "1.8" }}>
          <li>
            Test package shipping flow at{" "}
            <a href="/ship" style={{ color: "#0369a1" }}>
              /ship
            </a>
          </li>
          <li>
            Test courier routes at{" "}
            <a href="/courier/routes" style={{ color: "#0369a1" }}>
              /courier/routes
            </a>
          </li>
          <li>
            Use Stripe test card: <code>4242 4242 4242 4242</code>
          </li>
          <li>Monitor for any errors in console</li>
          <li>Begin Phase 1.5 dashboard enhancements</li>
        </ol>
      </div>
    </div>
  );
}
