"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useUserRole } from "@/hooks/v2/useUserRole";
import { UserRole } from "@/lib/v2/types";
import { AuthGate } from "@/components/v2/AuthGate";
import { getRoleDisplay } from "@gosenderr/shared";

function SelectRoleContent() {
  const { uid } = useAuthUser();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);

  // If role already exists, redirect
  useEffect(() => {
    if (!roleLoading && role) {
      if (role === "customer") {
        router.push("/customer/dashboard");
      } else if (role === "courier") {
        // Redirect to onboarding if no courierProfile, else dashboard
        router.push("/courier/dashboard");
      } else if (role === "admin") {
        router.push("/admin/dashboard");
      } else if (role === "runner") {
        router.push("/runner/dashboard");
      } else if (role === "vendor") {
        router.push("/vendor/items");
      } else {
        router.push("/customer/dashboard");
      }
    }
  }, [role, roleLoading, router]);

  const handleSelectRole = async (selectedRole: UserRole) => {
    if (!uid || selecting) return;

    setSelecting(true);

    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      const isNew = !userSnap.exists();

      const updates: any = {
        role: selectedRole,
        updatedAt: serverTimestamp(),
      };

      if (isNew) {
        updates.createdAt = serverTimestamp();
      }

      // Don't initialize courier object here - let onboarding wizard handle it
      // Courier will be redirected to /courier/onboarding

      await setDoc(userRef, updates, { merge: true });

      // Navigate to appropriate page
      if (selectedRole === "customer") {
        router.push("/customer/dashboard");
      } else if (selectedRole === "courier") {
        router.push("/courier/onboarding");
      } else if (selectedRole === "runner") {
        router.push("/runner/dashboard");
      } else if (selectedRole === "vendor") {
        router.push("/vendor/items");
      } else {
        router.push("/customer/dashboard");
      }
    } catch (error) {
      console.error("Failed to set role:", error);
      setSelecting(false);
    }
  };

  if (roleLoading) {
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (role) {
    return null; // Will redirect via useEffect
  }

  const roles = [
    { value: "customer" as UserRole, ...getRoleDisplay("customer") },
    { value: "courier" as UserRole, ...getRoleDisplay("courier") },
    { value: "runner" as UserRole, ...getRoleDisplay("runner") },
    { value: "vendor" as UserRole, ...getRoleDisplay("vendor") },
  ];

  return (
    <div
      style={{
        padding: "50px",
        maxWidth: "600px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h1>Select Your Role</h1>
      <p style={{ color: "#666", marginTop: "10px", marginBottom: "40px" }}>
        Choose how you want to use GoSenderR
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "24px",
          justifyContent: "center",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {roles.map((roleOption) => (
          <button
            key={roleOption.value}
            onClick={() => handleSelectRole(roleOption.value)}
            disabled={selecting}
            style={{
              padding: "40px 30px",
              border: `2px solid ${roleOption.color}33`,
              borderRadius: "12px",
              background: "white",
              cursor: selecting ? "not-allowed" : "pointer",
              opacity: selecting ? 0.6 : 1,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!selecting) {
                e.currentTarget.style.borderColor = roleOption.color;
                e.currentTarget.style.background = `${roleOption.color}11`;
              }
            }}
            onMouseLeave={(e) => {
              if (!selecting) {
                e.currentTarget.style.borderColor = `${roleOption.color}33`;
                e.currentTarget.style.background = "white";
              }
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>
              {roleOption.icon}
            </div>
            <h2
              style={{
                margin: "0 0 8px 0",
                fontSize: "24px",
                color: roleOption.color,
              }}
            >
              {roleOption.name}
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#666",
                margin: "0 0 8px 0",
                fontWeight: 600,
              }}
            >
              {roleOption.tagline}
            </p>
            <p style={{ fontSize: "12px", color: "#999", margin: 0 }}>
              {roleOption.description}
            </p>
          </button>
        ))}
      </div>

      {selecting && (
        <p style={{ marginTop: "30px", color: "#999", fontSize: "14px" }}>
          Setting up your account...
        </p>
      )}
    </div>
  );
}

export default function V2SelectRole() {
  return (
    <AuthGate>
      <SelectRoleContent />
    </AuthGate>
  );
}
