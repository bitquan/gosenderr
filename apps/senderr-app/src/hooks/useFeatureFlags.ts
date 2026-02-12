import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_FEATURE_FLAGS,
  normalizeFeatureFlags,
} from "@gosenderr/shared";
import type { FeatureFlags } from "@gosenderr/shared";

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "featureFlags", "config"),
      (snapshot) => {
        if (snapshot.exists()) {
          setFlags(normalizeFeatureFlags(snapshot.data()));
        } else {
          // Return default flags if document doesn't exist.
          setFlags(DEFAULT_FEATURE_FLAGS as unknown as FeatureFlags);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error loading feature flags:", err);
        setError(err as Error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { flags, loading, error };
}
