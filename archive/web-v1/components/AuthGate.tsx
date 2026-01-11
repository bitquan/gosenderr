'use client';

import { useAuthUser } from '@/hooks/useAuthUser';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
