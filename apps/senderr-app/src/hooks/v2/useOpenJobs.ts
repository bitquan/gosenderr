
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, or, and } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Job } from "@/lib/v2/types";
import { useAuthUser } from "@/hooks/v2/useAuthUser";

export function useOpenJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const { uid, loading: authLoading } = useAuthUser();

  const retry = () => {
    setError(null);
    setLoading(true);
    setRetryToken((value) => value + 1);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!uid) {
      setJobs([]);
      setError(null);
      setLoading(false);
      return;
    }

    setError(null);

    const jobsRef = collection(db, "jobs");
    // Show both open jobs AND jobs accepted by this courier
    const q = query(
      jobsRef,
      or(
        and(where("status", "==", "open"), where("offerCourierUid", "==", uid)),
        and(where("status", "==", "open"), where("offerCourierUid", "==", null)),
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
    }, (snapshotError) => {
      setError(snapshotError as Error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid, authLoading, retryToken]);

  return { jobs, loading, error, retry, isOffline };
}
