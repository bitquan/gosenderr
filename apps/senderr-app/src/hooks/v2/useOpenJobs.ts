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

type JobsSyncState = {
  status: "ok" | "reconnecting" | "stale" | "error";
};

export function useOpenJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<JobsSyncState>({ status: "ok" });
  const { uid, loading: authLoading } = useAuthUser();

  useEffect(() => {
    if (authLoading) {
      setSyncState({ status: "reconnecting" });
      return;
    }

    if (!uid) {
      setJobs([]);
      setLoading(false);
      setSyncState({ status: "ok" });
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

    setSyncState({ status: "reconnecting" });

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const jobsList: Job[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Job[];
        setJobs(jobsList);
        setLoading(false);
        setSyncState({ status: snapshot.metadata.fromCache ? "stale" : "ok" });
      },
      (error) => {
        console.error("Failed to sync jobs:", error);
        setLoading(false);
        setSyncState({ status: "error" });
      },
    );

    return () => unsubscribe();
  }, [uid, authLoading]);

  return { jobs, loading, syncState };
}
