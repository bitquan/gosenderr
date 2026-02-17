import { collection, onSnapshot, query, where, type Firestore } from 'firebase/firestore';

type JobRecord = { id: string };

interface SubscribeCourierJobsParams<T extends JobRecord> {
  db: Firestore;
  uid: string;
  mapDoc: (docData: { id: string; data: () => unknown }) => T;
  onUpdate: (jobs: T[]) => void;
  onError?: (error: unknown) => void;
}

export function subscribeCourierJobs<T extends JobRecord>({
  db,
  uid,
  mapDoc,
  onUpdate,
  onError,
}: SubscribeCourierJobsParams<T>): () => void {
  const jobsRef = collection(db, 'jobs');
  const primaryQuery = query(jobsRef, where('courierUid', '==', uid));
  const legacyQuery = query(jobsRef, where('courierId', '==', uid));

  let primaryJobs: T[] = [];
  let legacyJobs: T[] = [];

  const mergeJobs = (): T[] => {
    const mergedMap = new Map<string, T>();
    [...primaryJobs, ...legacyJobs].forEach((job) => {
      mergedMap.set(job.id, job);
    });
    return Array.from(mergedMap.values());
  };

  const publish = () => {
    onUpdate(mergeJobs());
  };

  const unsubPrimary = onSnapshot(
    primaryQuery,
    (snapshot) => {
      primaryJobs = snapshot.docs.map((doc) => mapDoc({ id: doc.id, data: () => doc.data() }));
      publish();
    },
    (error) => {
      onError?.(error);
    },
  );

  const unsubLegacy = onSnapshot(
    legacyQuery,
    (snapshot) => {
      legacyJobs = snapshot.docs.map((doc) => mapDoc({ id: doc.id, data: () => doc.data() }));
      publish();
    },
    (error) => {
      onError?.(error);
    },
  );

  return () => {
    unsubPrimary();
    unsubLegacy();
  };
}
