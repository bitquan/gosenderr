import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Job } from '@/lib/v2/types';

export function useCustomerJobs(uid: string | null) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setJobs([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadJobs = async () => {
      try {
        const jobsRef = collection(db, 'jobs');
        const q = query(
          jobsRef,
          where('createdByUid', '==', uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        if (cancelled) return;

        const jobList: Job[] = [];
        snapshot.forEach((doc) => {
          jobList.push({
            id: doc.id,
            ...doc.data(),
          } as Job);
        });
        setJobs(jobList);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching customer jobs:', err);
        setError(err as Error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadJobs();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  return { jobs, loading, error };
}
