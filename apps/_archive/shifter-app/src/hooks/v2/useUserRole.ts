
import { useEffect } from "react";
import { useUserDoc } from "./useUserDoc";
import { UserRole } from "@/lib/v2/types";

export function useUserRole() {
  const { userDoc, loading, uid } = useUserDoc();

  useEffect(() => {
    console.log("🎭 [useUserRole] Hook state:", {
      uid,
      role: userDoc?.role,
      loading,
      userDoc,
    });
  }, [uid, userDoc, loading]);

  return {
    role: userDoc?.role as UserRole | null | undefined,
    loading,
    uid,
    userDoc,
  };
}
