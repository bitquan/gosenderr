'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Job } from '@/lib/v2/types';

export function useOpenJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const jobsRef = collection(db, 'jobs');
    const q = query(
      jobsRef,
      where('status', '==', 'open')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsList: Job[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Job[];
      setJobs(jobsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { jobs, loading };
}
