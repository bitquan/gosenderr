import { useCallback, useEffect, useRef, useState } from "react";
import { getEarnings, GetEarningsResponse } from "@/lib/courierFunctions";

export interface UseEarningsOptions {
  refreshIntervalMs?: number;
  enabled?: boolean;
}

export function useEarnings(options: UseEarningsOptions = {}) {
  const { refreshIntervalMs = 10000, enabled = true } = options;
  const [data, setData] = useState<GetEarningsResponse["earnings"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFirstLoadRef = useRef(true);

  const fetchEarnings = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    if (isFirstLoadRef.current) {
      setLoading(true);
    }

    try {
      const result = await getEarnings();

      if (!result.success) {
        const msg = result.error || "Failed to fetch earnings";
        setError(msg);
        setData(null);
        return;
      }

      setData(result.earnings || null);
      setError(null);
    } catch (err: any) {
      const msg = err?.message || "Failed to fetch earnings";
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
      isFirstLoadRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    fetchEarnings();

    if (!enabled || refreshIntervalMs <= 0) {
      return;
    }

    const id = window.setInterval(fetchEarnings, refreshIntervalMs);
    return () => window.clearInterval(id);
  }, [fetchEarnings, enabled, refreshIntervalMs]);

  return {
    data,
    loading,
    error,
    refresh: fetchEarnings,
  };
}
