"use client";

import { useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { getAuthSafe } from "@/lib/firebase/auth";

export function useAuthUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const auth = getAuthSafe();

    if (!auth) {
      // Firebase not initialized yet (SSR or initial load)
      setUser(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    loading: user === undefined,
    uid: user?.uid,
  };
}
