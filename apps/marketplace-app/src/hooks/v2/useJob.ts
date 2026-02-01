
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { JobDoc } from '@/lib/v2/types';

export function useJob(jobId: string | null) {
  const [job, setJob] = useState<JobDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setLoading(false);
      return;
    }

    const jobRef = doc(db, 'jobs', jobId);
    const unsubscribe = onSnapshot(jobRef, (snapshot) => {
      if (snapshot.exists()) {
        setJob(snapshot.data() as JobDoc);
      } else {
        setJob(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [jobId]);

  return { job, loading };
}
