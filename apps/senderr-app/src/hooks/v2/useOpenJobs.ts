<<<<<<< HEAD

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, or, and } from "firebase/firestore";
=======
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  or,
  and,
} from "firebase/firestore";
>>>>>>> senderr_app
import { db } from "@/lib/firebase";
import { Job } from "@/lib/v2/types";
import { useAuthUser } from "@/hooks/v2/useAuthUser";

<<<<<<< HEAD
export function useOpenJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
=======
type JobsSyncState = {
  status: "ok" | "reconnecting" | "stale" | "error";
};

export function useOpenJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<JobsSyncState>({ status: "ok" });
>>>>>>> senderr_app
  const { uid, loading: authLoading } = useAuthUser();

  useEffect(() => {
    if (authLoading) {
<<<<<<< HEAD
=======
      setSyncState({ status: "reconnecting" });
>>>>>>> senderr_app
      return;
    }

    if (!uid) {
      setJobs([]);
      setLoading(false);
<<<<<<< HEAD
=======
      setSyncState({ status: "ok" });
>>>>>>> senderr_app
      return;
    }

    const jobsRef = collection(db, "jobs");
    // Show both open jobs AND jobs accepted by this courier
    const q = query(
      jobsRef,
      or(
        and(where("status", "==", "open"), where("offerCourierUid", "==", uid)),
<<<<<<< HEAD
        and(where("status", "==", "open"), where("offerCourierUid", "==", null)),
=======
        and(
          where("status", "==", "open"),
          where("offerCourierUid", "==", null),
        ),
>>>>>>> senderr_app
        where("courierUid", "==", uid),
      ),
    );

<<<<<<< HEAD
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsList: Job[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Job[];
      setJobs(jobsList);
      setLoading(false);
    });
=======
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
>>>>>>> senderr_app

    return () => unsubscribe();
  }, [uid, authLoading]);

<<<<<<< HEAD
  return { jobs, loading };
=======
  return { jobs, loading, syncState };
>>>>>>> senderr_app
}
