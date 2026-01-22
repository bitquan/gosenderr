"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import type { RouteDoc, RouteStatus } from "@gosenderr/shared";

interface UseRoutesOptions {
  status?: RouteStatus;
  courierId?: string;
}

export function useRoutes(options: UseRoutesOptions = {}) {
  const [routes, setRoutes] = useState<RouteDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { uid, loading: authLoading } = useAuthUser();

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    if (authLoading) {
      return;
    }

    if (!uid) {
      setRoutes([]);
      setLoading(false);
      return;
    }

    const constraints: QueryConstraint[] = [];

    if (options.status) {
      constraints.push(where("status", "==", options.status));
    }

    if (options.courierId) {
      constraints.push(where("courierId", "==", options.courierId));
    }

    const q = query(collection(db, "routes"), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const routesData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            routeId: data.routeId || doc.id,
          } as RouteDoc;
        });
        setRoutes(routesData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching routes:", err);
        setError(err as Error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [options.status, options.courierId, uid, authLoading]);

  return { routes, loading, error };
}
