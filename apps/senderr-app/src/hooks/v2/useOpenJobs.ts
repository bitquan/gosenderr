import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  or,
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
    // Show open jobs plus jobs assigned to this courier.
    // Offer-targeting is filtered client-side so docs missing offerCourierUid are still visible.
    const q = query(
      jobsRef,
      or(
        where("status", "in", ["open", "pending"]),
        where("courierUid", "==", uid),
      ),
    );

    setSyncState({ status: "reconnecting" });

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const mappedJobs = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Job[];

        const jobsList: Job[] = mappedJobs
          .filter((job) => {
            if (job.courierUid === uid) return true;
            if (!(job.status === "open" || job.status === "pending")) return false;

            const offerCourierUid = (job as any).offerCourierUid;
            return offerCourierUid == null || offerCourierUid === uid;
          });
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
