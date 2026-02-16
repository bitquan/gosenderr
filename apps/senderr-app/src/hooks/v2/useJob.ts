
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { JobDoc } from '@/lib/v2/types';

export function useJob(jobId: string | null) {
  const [job, setJob] = useState<JobDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  const retry = () => {
    setError(null);
    setLoading(true);
    setRetryToken((value) => value + 1);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setError(null);
      setLoading(false);
      return;
    }

    setError(null);
    const jobRef = doc(db, 'jobs', jobId);
    const unsubscribe = onSnapshot(
      jobRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setJob(snapshot.data() as JobDoc);
        } else {
          setJob(null);
        }
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError as Error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [jobId, retryToken]);

  return { job, loading, error, retry, isOffline };
}
