import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  or,
  and,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Job } from "@/lib/v2/types";
import { useAuthUser } from "@/hooks/v2/useAuthUser";

export function useOpenJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<any | undefined>(undefined);
  const { uid, loading: authLoading } = useAuthUser();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!uid) {
      setJobs([]);
      setLoading(false);
      return;
    }

    const jobsRef = collection(db, "jobs");
    // Show both open jobs AND jobs accepted by this courier
    const q = query(
      jobsRef,
      or(
        and(where("status", "==", "open"), where("offerCourierUid", "==", uid)),
        and(
          where("status", "==", "open"),
          where("offerCourierUid", "==", null),
        ),
        where("courierUid", "==", uid),
      ),
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
  }, [uid, authLoading]);

  return { jobs, loading, syncState };
}
