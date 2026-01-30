import { useCallback, useEffect, useRef, useState } from "react";
import { getAvailableJobs, AvailableJob } from "@/lib/courierFunctions";

export interface UseAvailableJobsOptions {
  lat?: number;
  lng?: number;
  limit?: number;
  maxDistance?: number;
  refreshIntervalMs?: number;
  enabled?: boolean;
}

export function useAvailableJobs(options: UseAvailableJobsOptions) {
  const {
    lat,
    lng,
    limit = 10,
    maxDistance = 5,
    refreshIntervalMs = 15000,
    enabled = true,
  } = options;

  const [jobs, setJobs] = useState<AvailableJob[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFirstLoadRef = useRef(true);

  const fetchJobs = useCallback(async () => {
    if (!enabled || lat === undefined || lng === undefined) {
      setJobs([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    if (isFirstLoadRef.current) {
      setLoading(true);
    }

    try {
      const result = await getAvailableJobs({
        lat,
        lng,
        limit,
        maxDistance,
      });

      if (!result.success) {
        const msg = result.error || "Failed to fetch available jobs";
        setError(msg);
        setJobs([]);
        setTotalCount(0);
        return;
      }

      setJobs(result.jobs || []);
      setTotalCount(result.totalCount || 0);
      setError(null);
    } catch (err: any) {
      const msg = err?.message || "Failed to fetch available jobs";
      setError(msg);
      setJobs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      isFirstLoadRef.current = false;
    }
  }, [enabled, lat, lng, limit, maxDistance]);

  useEffect(() => {
    fetchJobs();

    if (!enabled || refreshIntervalMs <= 0) {
      return;
    }

    const id = window.setInterval(fetchJobs, refreshIntervalMs);
    return () => window.clearInterval(id);
  }, [fetchJobs, enabled, refreshIntervalMs]);

  return {
    jobs,
    totalCount,
    loading,
    error,
    refresh: fetchJobs,
  };
}
