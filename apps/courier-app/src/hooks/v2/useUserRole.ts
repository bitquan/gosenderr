
import { useEffect } from "react";
import { useUserDoc } from "./useUserDoc";
import { UserRole } from "@/lib/v2/types";

export function useUserRole() {
  const { userDoc, loading, uid } = useUserDoc();

  // Extract role from userDoc
  // UserDoc has a single 'role' field
  const role = userDoc?.role as UserRole | null | undefined;

  useEffect(() => {
    console.log("🎭 [useUserRole] Hook state:", {
      uid,
      role,
      loading,
      userDocRole: userDoc?.role,
    });
  }, [uid, role, userDoc, loading]);

  return {
    role,
    loading,
    uid,
    userDoc,
  };
}
