'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firestore';
import { FeatureFlagDoc } from '@gosenderr/shared';

export function useFeatureFlag(flagKey: string) {
  const [flag, setFlag] = useState<FeatureFlagDoc | null | undefined>(undefined);

  useEffect(() => {
    if (!db) {
      // Firebase not initialized yet (SSR or initial load)
      setFlag(null);
      return;
    }

    const flagRef = doc(db, 'featureFlags', flagKey);
    const unsubscribe = onSnapshot(
      flagRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as FeatureFlagDoc;
          setFlag(data);
        } else {
          // Flag doesn't exist, default to disabled
          setFlag(null);
        }
      },
      (error) => {
        console.error(`Error fetching feature flag ${flagKey}:`, error);
        setFlag(null);
      }
    );

    return () => unsubscribe();
  }, [flagKey]);

  return {
    flag,
    enabled: flag?.enabled ?? false,
    loading: flag === undefined,
  };
}
