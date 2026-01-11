'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/auth';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { useUserRole } from '@/hooks/v2/useUserRole';

interface NavbarProps {
  children: ReactNode;
}

export function Navbar({ children }: NavbarProps) {
  const { user } = useAuthUser();
  const { role } = useUserRole();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/v2/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ 
        background: '#6E56CF', 
        color: 'white', 
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <a href="/v2" style={{ color: 'white', textDecoration: 'none', fontWeight: '600', fontSize: '18px' }}>
            GoSenderr
          </a>
          {role && (
            <span style={{ 
              padding: '4px 12px', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '12px',
              fontSize: '12px',
              textTransform: 'capitalize'
            }}>
              {role === 'customer' ? '📦 Customer' : '🚗 Courier'}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {role === 'customer' && (
            <a href="/v2/customer/jobs" style={{ color: 'white', textDecoration: 'none', fontSize: '14px' }}>
              My Jobs
            </a>
          )}
          {role === 'courier' && (
            <>
              <a href="/v2/courier/dashboard" style={{ color: 'white', textDecoration: 'none', fontSize: '14px' }}>
                Dashboard
              </a>
              <a href="/v2/courier/setup" style={{ color: 'white', textDecoration: 'none', fontSize: '14px' }}>
                Setup
              </a>
            </>
          )}
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
            {user.email}
          </span>
          <button
            onClick={handleSignOut}
            style={{
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Sign Out
          </button>
        </div>
      </nav>
      
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
