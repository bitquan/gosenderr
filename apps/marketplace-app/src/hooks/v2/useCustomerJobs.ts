import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
// @ts-expect-error - Used in type definitions
import { Job, JobDoc } from '@/lib/v2/types';

export function useCustomerJobs(uid: string | null) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setJobs([]);
      setLoading(false);
      return;
    }

    const jobsRef = collection(db, 'jobs');
    const q = query(
      jobsRef,
      where('createdByUid', '==', uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const jobList: Job[] = [];
        snapshot.forEach((doc) => {
          jobList.push({
            id: doc.id,
            ...doc.data(),
          } as Job);
        });
        setJobs(jobList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching customer jobs:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  return { jobs, loading, error };
}
