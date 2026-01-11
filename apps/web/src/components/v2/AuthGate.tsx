'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/hooks/v2/useAuthUser';

interface AuthGateProps {
  children: ReactNode;
}

/**
 * v2 AuthGate - blocks unsigned users, redirects to /v2/login
 */
export function AuthGate({ children }: AuthGateProps) {
  const { user, loading } = useAuthUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/v2/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
