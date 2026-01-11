'use client';

import { useUserDoc } from './useUserDoc';
import { UserRole } from '@gosenderr/shared';

export function useUserRole(uid: string | null | undefined) {
  const { userDoc, loading, error } = useUserDoc(uid);
  
  return { 
    role: userDoc?.role || null, 
    loading, 
    error 
  };
}
