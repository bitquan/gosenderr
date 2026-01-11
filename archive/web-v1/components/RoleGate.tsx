'use client';

import { useAuthUser } from '@/hooks/useAuthUser';
import { useUserRole } from '@/hooks/useUserRole';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserRole } from '@gosenderr/shared';

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export function RoleGate({ children, allowedRoles }: RoleGateProps) {
  const { user, loading: authLoading } = useAuthUser();
  const { role, loading: roleLoading } = useUserRole(user?.uid);
  const router = useRouter();
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    // Wait a moment on initial mount to let Firestore listener start
    if (!initialCheckDone) {
      const timer = setTimeout(() => setInitialCheckDone(true), 500);
      return () => clearTimeout(timer);
    }
  }, [initialCheckDone]);

  useEffect(() => {
    if (!initialCheckDone) {
      console.log('[RoleGate] Initial check not done yet, waiting...');
      return;
    }

    console.log('[RoleGate] Check:', { authLoading, roleLoading, hasUser: !!user, role, allowedRoles });
    
    // Only check once loading is complete
    if (authLoading || roleLoading) {
      console.log('[RoleGate] Still loading, waiting...');
      return;
    }
    
    if (!user) {
      console.log('[RoleGate] No user, redirecting to /login');
      router.replace('/login');
      return;
    }
    
    // If no role, check if we just set one (to avoid redirect loops)
    if (!role) {
      const justSetRole = sessionStorage.getItem('justSetRole');
      if (justSetRole === 'true') {
        console.log('[RoleGate] No role yet, but justSetRole flag is set, waiting for Firestore...');
        // Clear the flag after a reasonable timeout
        setTimeout(() => sessionStorage.removeItem('justSetRole'), 5000);
        return;
      }
      console.log('[RoleGate] No role found, redirecting to /select-role');
      router.replace('/select-role');
      return;
    }
    
    // Clear the flag once we have a role
    sessionStorage.removeItem('justSetRole');
    
    // If has role but not in allowed list, redirect to appropriate page
    if (!allowedRoles.includes(role)) {
      console.log('[RoleGate] Role', role, 'not in allowed list', allowedRoles);
      if (role === 'driver') {
        router.replace('/driver-not-implemented');
      } else if (role === 'customer') {
        router.replace('/customer/jobs');
      } else {
        router.replace('/');
      }
      return;
    }
    
    console.log('[RoleGate] Access granted for role:', role);
    // If role matches allowedRoles, do nothing (allow access)
  }, [initialCheckDone, user, role, authLoading, roleLoading, allowedRoles, router]);

  if (!initialCheckDone || authLoading || roleLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || !role || !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}
