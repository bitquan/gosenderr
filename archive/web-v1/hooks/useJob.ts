'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firestore';
import { JobDoc } from '@gosenderr/shared';

export function useJob(jobId: string | null | undefined) {
  const [job, setJob] = useState<(JobDoc & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(db, 'jobs', jobId);
    
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setJob({
            id: snapshot.id,
            ...(snapshot.data() as JobDoc),
          });
        } else {
          setJob(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error subscribing to job:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobId]);

  return { job, loading, error };
}
