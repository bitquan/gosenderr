'use client';

import { useUserDoc } from './useUserDoc';
import { UserRole } from '@/lib/v2/types';

export function useUserRole() {
  const { userDoc, loading, uid } = useUserDoc();

  return {
    role: userDoc?.role as UserRole | null | undefined,
    loading,
    uid,
    userDoc,
  };
}
