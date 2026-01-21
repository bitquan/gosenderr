'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firestore';
import { FeatureFlagDoc } from '@gosenderr/shared';

// NOTE: This query requires a Firestore composite index:
// Collection: featureFlags
// Fields: category (Ascending), key (Ascending)
// Create via Firebase Console or auto-generated on first use
export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlagDoc[] | null | undefined>(undefined);

  useEffect(() => {
    if (!db) {
      // Firebase not initialized yet (SSR or initial load)
      setFlags(null);
      return;
    }

    const flagsRef = collection(db, 'featureFlags');
    const q = query(flagsRef, orderBy('category'), orderBy('key'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const flagsData = snapshot.docs.map((doc) => ({
          ...doc.data(),
        })) as FeatureFlagDoc[];
        setFlags(flagsData);
      },
      (error) => {
        console.error('Error fetching feature flags:', error);
        setFlags([]);
      }
    );

    return () => unsubscribe();
  }, []);

  return {
    flags,
    loading: flags === undefined,
  };
}
