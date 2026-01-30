import { useState, useCallback } from 'react';
import { claimJob as claimJobApi } from '@/lib/v2/jobs';

export type ClaimResult =
  | { success: true }
  | { success: false; type: 'price-mismatch' | 'not-eligible' | 'already-claimed' | 'other'; message: string; serverFee?: number };

export function useClaimJob() {
  const [loading, setLoading] = useState(false);

  const claim = useCallback(async (jobId: string, courierUid: string, agreedFee: number) : Promise<ClaimResult> => {
    setLoading(true);
    try {
      await claimJobApi(jobId, courierUid, agreedFee);
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || String(err || 'Unknown error');

      if (msg.includes('price-mismatch')) {
        const m = msg.match(/Server calculated fee \$(\d+(?:\.\d+)?)/i);
        const serverFee = m ? parseFloat(m[1]) : undefined;
        return {
          success: false,
          type: 'price-mismatch',
          message: msg,
          serverFee,
        };
      }

      if (msg.includes('not-eligible')) {
        return {
          success: false,
          type: 'not-eligible',
          message: msg,
        };
      }

      if (msg.includes('already claimed') || msg.includes('already claimed or not available')) {
        return {
          success: false,
          type: 'already-claimed',
          message: msg,
        };
      }

      return {
        success: false,
        type: 'other',
        message: msg,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return { claim, loading };
}
