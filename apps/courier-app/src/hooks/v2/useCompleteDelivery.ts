import { useCallback, useState } from "react";
import { completeDelivery } from "@/lib/courierFunctions";

export interface CompleteDeliveryPayload {
  jobId: string;
  photoUrls: string[];
  signature?: string;
  notes?: string;
}

export function useCompleteDelivery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = useCallback(async (payload: CompleteDeliveryPayload) => {
    setLoading(true);
    setError(null);

    try {
      const result = await completeDelivery(payload);

      if (!result.success) {
        const msg = result.error || "Failed to complete delivery";
        setError(msg);
        return { success: false as const, error: msg };
      }

      return {
        success: true as const,
        earnedAmount: result.earnedAmount,
        totalEarningsToday: result.totalEarningsToday,
      };
    } catch (err: any) {
      const msg = err?.message || "Failed to complete delivery";
      setError(msg);
      return { success: false as const, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  return { completeDelivery: complete, loading, error };
}
