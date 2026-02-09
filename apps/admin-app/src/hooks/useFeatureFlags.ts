
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, getDbOrThrow } from "@/lib/firebase/client";
import { DEFAULT_FEATURE_FLAGS } from "@gosenderr/shared";
import type { FeatureFlags } from "@gosenderr/shared";

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const safeDb = getDbOrThrow()
        const snapshot = await getDoc(doc(safeDb, "featureFlags", "config"))
        if (!mounted) return
        if (snapshot.exists()) {
          setFlags(snapshot.data() as FeatureFlags)
        } else {
          setFlags(DEFAULT_FEATURE_FLAGS)
        }
      } catch (err) {
        if (!mounted) return
        console.error("Error loading feature flags:", err)
        setError(err as Error)
        // Permission or init errors should not crash admin shell.
        setFlags(DEFAULT_FEATURE_FLAGS)
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, []);

  return { flags, loading, error };
}
