import { useCallback, useState } from "react";
import { startDelivery } from "@/lib/courierFunctions";

export function useStartDelivery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (jobId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await startDelivery({ jobId });

      if (!result.success) {
        const msg = result.error || "Failed to start delivery";
        setError(msg);
        return { success: false as const, error: msg };
      }

      return { success: true as const, job: result.job };
    } catch (err: any) {
      const msg = err?.message || "Failed to start delivery";
      setError(msg);
      return { success: false as const, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  return { startDelivery: start, loading, error };
}
