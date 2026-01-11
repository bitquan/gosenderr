'use client';

import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';

export default function DriverNotImplementedPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      sessionStorage.clear();
      localStorage.clear();
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', textAlign: 'center' }}>
      <h1>Driver App</h1>
      <p style={{ fontSize: '18px', margin: '30px 0', color: '#666' }}>
        The driver interface is available on mobile only.
      </p>
      <p style={{ marginBottom: '30px' }}>
        Please use the GoSenderr mobile app (iOS/Android) to accept and complete deliveries.
      </p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <a href="/" style={{ padding: '12px 24px', background: '#2196f3', color: 'white', textDecoration: 'none', borderRadius: '4px', display: 'inline-block' }}>
          Back to Home
        </a>
        <button
          onClick={handleSignOut}
          style={{
            padding: '12px 24px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
