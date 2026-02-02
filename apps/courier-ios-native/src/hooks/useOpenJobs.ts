import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, isFirebaseReady } from '../lib/firebase';
import type { Job } from '../types/job';

const ACTIVE_STATUSES = new Set([
  'assigned',
  'in_progress',
  'enroute_pickup',
  'arrived_pickup',
  'picked_up',
  'enroute_dropoff',
  'arrived_dropoff',
]);

export function useOpenJobs(uid: string | null) {
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseReady()) {
      setOpenJobs([]);
      setMyJobs([]);
      setLoading(false);
      return;
    }

    const jobsRef = collection(db, 'jobs');
    const openQuery = query(
      jobsRef,
      where('status', 'in', ['open', 'pending'])
    );
    const unsubscribeOpen = onSnapshot(
      openQuery,
      (snapshot) => {
        const jobs = snapshot.docs.map((doc) => ({
          ...(doc.data() as Job),
          id: doc.id,
        }));
        setOpenJobs(jobs);
        setLoading(false);
      },
      () => setLoading(false)
    );

    let unsubscribeMine: () => void = () => undefined;
    if (uid) {
      const myQuery = query(jobsRef, where('courierUid', '==', uid));
      unsubscribeMine = onSnapshot(
        myQuery,
        (snapshot) => {
          const jobs = snapshot.docs
            .map((doc) => ({
              ...(doc.data() as Job),
              id: doc.id,
            }))
            .filter((job) => ACTIVE_STATUSES.has(job.status));
          setMyJobs(jobs);
        },
        () => undefined
      );
    }

    return () => {
      unsubscribeOpen();
      unsubscribeMine();
    };
  }, [uid]);

  const jobs = useMemo(() => {
    const map = new Map<string, Job>();
    openJobs.forEach((job) => map.set(job.id, job));
    myJobs.forEach((job) => map.set(job.id, job));
    return Array.from(map.values());
  }, [openJobs, myJobs]);

  return { jobs, loading };
}
