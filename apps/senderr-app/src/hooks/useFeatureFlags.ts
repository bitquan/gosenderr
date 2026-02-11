import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_FEATURE_FLAGS,
  normalizeFeatureFlags,
  type FeatureFlags,
} from "@gosenderr/shared";

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadFlags = async () => {
      try {
        const snapshot = await getDoc(doc(db, "featureFlags", "config"));
        if (cancelled) return;

        if (snapshot.exists()) {
          setFlags(normalizeFeatureFlags(snapshot.data()));
        } else {
          setFlags(DEFAULT_FEATURE_FLAGS as unknown as FeatureFlags);
        }
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const firestoreCode = (err as { code?: string } | null)?.code;
        if (firestoreCode === "permission-denied") {
          setFlags(DEFAULT_FEATURE_FLAGS as unknown as FeatureFlags);
          setError(null);
        } else {
          console.error("Error loading feature flags:", err);
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadFlags();

    return () => {
      cancelled = true;
    };
  }, []);

  return { flags, loading, error };
}
