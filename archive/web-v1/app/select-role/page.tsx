'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useUserRole } from '@/hooks/useUserRole';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/components/AuthGate';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firestore';
import { UserRole } from '@gosenderr/shared';

function SelectRoleContent() {
  const { user } = useAuthUser();
  const { role, loading: roleLoading } = useUserRole(user?.uid);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [targetRole, setTargetRole] = useState<UserRole | null>(null);

  // After we set targetRole, wait for the role to actually appear in Firestore
  useEffect(() => {
    if (targetRole && !roleLoading && role === targetRole) {
      console.log('[SelectRole] Role confirmed in Firestore, redirecting...');
      if (role === 'customer') {
        router.replace('/customer/jobs');
      } else if (role === 'driver') {
        router.replace('/driver-not-implemented');
      }
    }
  }, [targetRole, role, roleLoading, router]);

  const handleRoleSelect = async (selectedRole: UserRole) => {
    if (!user || submitting) return; // Prevent double submission

    console.log('handleRoleSelect called with role:', selectedRole);
    setSubmitting(true);
    setError('');

    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      const data: any = {
        role: selectedRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      if (user.phoneNumber) {
        data.phone = user.phoneNumber;
      }
      
      if (user.displayName) {
        data.displayName = user.displayName;
      }

      console.log('Writing to Firestore:', data);
      await setDoc(userDocRef, data);
      console.log('Firestore write complete');
      
      // Set flag in sessionStorage so RoleGate knows we just set a role
      sessionStorage.setItem('justSetRole', 'true');
      
      // Set target role - useEffect will redirect when it's confirmed in Firestore
      setTargetRole(selectedRole);
      console.log('Waiting for Firestore to sync...');
    } catch (err: any) {
      console.error('Error setting role:', err);
      setError(err.message || 'Failed to set role');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      {submitting ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>Setting up your account...</p>
          <p style={{ color: '#666' }}>Please wait</p>
        </div>
      ) : (
        <>
          <h1>Select Your Role</h1>
          <p style={{ marginBottom: '20px' }}>Choose how you want to use GoSenderr:</p>

          {error && <p style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}

          <button
            onClick={() => handleRoleSelect('customer')}
            disabled={submitting}
            style={{
              width: '100%',
              padding: '15px',
              marginBottom: '10px',
              fontSize: '16px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Customer - Send Packages
          </button>

          <button
            onClick={() => handleRoleSelect('driver')}
            disabled={submitting}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '16px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Driver - Deliver Packages
          </button>
        </>
      )}
    </div>
  );
}

export default function SelectRolePage() {
  return (
    <AuthGate>
      <SelectRoleContent />
    </AuthGate>
  );
}
