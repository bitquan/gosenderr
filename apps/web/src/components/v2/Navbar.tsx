'use client';

import { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/auth';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { useUserRole } from '@/hooks/v2/useUserRole';
import Link from 'next/link';

interface NavbarProps {
  children: ReactNode;
}

export function Navbar({ children }: NavbarProps) {
  const { user } = useAuthUser();
  const { role } = useUserRole();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Don't show navbar on login/select-role pages
  const hideNavbar = pathname === '/login' || pathname === '/select-role';

  if (hideNavbar) {
    return <>{children}</>;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav
        style={{
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '10px 12px',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
          {/* Logo */}
          <Link
            href="/marketplace"
            style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#6E56CF',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            GoSenderr
          </Link>

          {/* Navigation Links - Responsive */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link
              href="/marketplace"
              style={{
                fontSize: '13px',
                fontWeight: pathname.startsWith('/marketplace') ? '600' : '400',
                color: pathname.startsWith('/marketplace') ? '#6E56CF' : '#666',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Marketplace
            </Link>

            {user && role === 'customer' && (
              <Link
                href="/customer/jobs"
                style={{
                  fontSize: '13px',
                  fontWeight: pathname.startsWith('/customer') ? '600' : '400',
                  color: pathname.startsWith('/customer') ? '#6E56CF' : '#666',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Jobs
              </Link>
            )}

            {user && role === 'courier' && (
              <Link
                href="/courier/dashboard"
                style={{
                  fontSize: '13px',
                  fontWeight: pathname.startsWith('/courier') ? '600' : '400',
                  color: pathname.startsWith('/courier') ? '#6E56CF' : '#666',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Dashboard
              </Link>
            )}

            {user && (
              <Link
                href="/vendor/items"
                style={{
                  fontSize: '13px',
                  fontWeight: pathname.startsWith('/vendor') ? '600' : '400',
                  color: pathname.startsWith('/vendor') ? '#6E56CF' : '#666',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Items
              </Link>
            )}

            {/* User Menu */}
            {user ? (
              <button
                onClick={handleSignOut}
                style={{
                  fontSize: '12px',
                  color: '#666',
                  background: 'none',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Sign Out
              </button>
            ) : (
              <Link
                href="/login"
                style={{
                  fontSize: '12px',
                  color: 'white',
                  background: '#6E56CF',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                }}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>
      
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
