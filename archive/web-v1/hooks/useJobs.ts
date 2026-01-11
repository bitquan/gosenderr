'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/firestore';
import { JobDoc } from '@gosenderr/shared';

export function useJobs(uid: string | null | undefined) {
  const [jobs, setJobs] = useState<Array<JobDoc & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setJobs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const jobsRef = collection(db, 'jobs');
    // TODO: If Firestore requires composite index for this query, deploy:
    // Index: collection=jobs, fields: createdByUid(Ascending), createdAt(Descending)
    const q = query(
      jobsRef, 
      where('createdByUid', '==', uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedJobs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as JobDoc),
        }));
        setJobs(fetchedJobs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error subscribing to jobs:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  return { jobs, loading, error };
}
