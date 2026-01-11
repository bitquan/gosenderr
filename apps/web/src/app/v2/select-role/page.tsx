'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { useUserRole } from '@/hooks/v2/useUserRole';
import { UserRole } from '@/lib/v2/types';
import { AuthGate } from '@/components/v2/AuthGate';

function SelectRoleContent() {
  const { uid } = useAuthUser();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);

  // If role already exists, redirect
  useEffect(() => {
    if (!roleLoading && role) {
      if (role === 'customer') {
        router.push('/v2/customer/jobs');
      } else if (role === 'courier') {
        router.push('/v2/courier/dashboard');
      }
    }
  }, [role, roleLoading, router]);

  const handleSelectRole = async (selectedRole: UserRole) => {
    if (!uid || selecting) return;

    setSelecting(true);

    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      const isNew = !userSnap.exists();

      const updates: any = {
        role: selectedRole,
        updatedAt: serverTimestamp(),
      };

      if (isNew) {
        updates.createdAt = serverTimestamp();
      }

      // Initialize courier object if selecting courier role
      if (selectedRole === 'courier') {
        updates.courier = {
          isOnline: false,
          transportMode: 'car',
          rateCard: {
            baseFee: 5,
            perMile: 1.5,
          },
        };
      }

      await setDoc(userRef, updates, { merge: true });

      // Navigate to appropriate page
      if (selectedRole === 'customer') {
        router.push('/v2/customer/jobs');
      } else {
        router.push('/v2/courier/setup');
      }
    } catch (error) {
      console.error('Failed to set role:', error);
      setSelecting(false);
    }
  };

  if (roleLoading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (role) {
    return null; // Will redirect via useEffect
  }

  return (
    <div style={{ padding: '50px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Select Your Role</h1>
      <p style={{ color: '#666', marginTop: '10px', marginBottom: '40px' }}>
        Choose how you want to use GoSenderr
      </p>

      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => handleSelectRole('customer')}
          disabled={selecting}
          style={{
            padding: '40px 30px',
            border: '2px solid #ddd',
            borderRadius: '12px',
            background: 'white',
            cursor: selecting ? 'not-allowed' : 'pointer',
            minWidth: '200px',
            opacity: selecting ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!selecting) {
              e.currentTarget.style.borderColor = '#6E56CF';
              e.currentTarget.style.background = '#f9f8ff';
            }
          }}
          onMouseLeave={(e) => {
            if (!selecting) {
              e.currentTarget.style.borderColor = '#ddd';
              e.currentTarget.style.background = 'white';
            }
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Customer</h2>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
            Request deliveries for items you can't transport
          </p>
        </button>

        <button
          onClick={() => handleSelectRole('courier')}
          disabled={selecting}
          style={{
            padding: '40px 30px',
            border: '2px solid #ddd',
            borderRadius: '12px',
            background: 'white',
            cursor: selecting ? 'not-allowed' : 'pointer',
            minWidth: '200px',
            opacity: selecting ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!selecting) {
              e.currentTarget.style.borderColor = '#6E56CF';
              e.currentTarget.style.background = '#f9f8ff';
            }
          }}
          onMouseLeave={(e) => {
            if (!selecting) {
              e.currentTarget.style.borderColor = '#ddd';
              e.currentTarget.style.background = 'white';
            }
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚗</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Courier</h2>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
            Deliver items and set your own rates
          </p>
        </button>
      </div>

      {selecting && (
        <p style={{ marginTop: '30px', color: '#999', fontSize: '14px' }}>
          Setting up your account...
        </p>
      )}
    </div>
  );
}

export default function V2SelectRole() {
  return (
    <AuthGate>
      <SelectRoleContent />
    </AuthGate>
  );
}
