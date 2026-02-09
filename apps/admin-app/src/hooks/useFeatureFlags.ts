
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { DEFAULT_FEATURE_FLAGS } from "@gosenderr/shared";
import type { FeatureFlags } from "@gosenderr/shared";

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    getDoc(doc(db, "featureFlags", "config"))
      .then((snapshot) => {
        if (!mounted) return;
        if (snapshot.exists()) {
          setFlags(snapshot.data() as FeatureFlags);
        } else {
          // Return default flags if document doesn't exist.
          setFlags(DEFAULT_FEATURE_FLAGS);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Error loading feature flags:", err);
        setError(err as Error);
        // Permission errors should not crash admin shell.
        setFlags(DEFAULT_FEATURE_FLAGS);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { flags, loading, error };
}
