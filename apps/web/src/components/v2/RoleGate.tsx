'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserRole } from '@/hooks/v2/useUserRole';

interface RoleGateProps {
  children: ReactNode;
  allowedRole: 'customer' | 'courier';
}

/**
 * v2 RoleGate - enforces role, redirects if missing or wrong
 */
export function RoleGate({ children, allowedRole }: RoleGateProps) {
  const { role, loading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!role) {
      // No role set, go to select-role
      router.push('/v2/select-role');
      return;
    }

    if (role !== allowedRole) {
      // Wrong role, redirect to correct home
      if (role === 'customer') {
        router.push('/v2/customer/jobs');
      } else {
        router.push('/v2/courier/dashboard');
      }
    }
  }, [role, loading, allowedRole, router]);

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!role || role !== allowedRole) {
    return null;
  }

  return <>{children}</>;
}
