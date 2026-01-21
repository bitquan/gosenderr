'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

type OnboardingStatus = 'pending' | 'active' | 'restricted';

export default function StripeOnboardingPage() {
  const { user, loading: authLoading } = useAuthUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>('pending');
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const success = searchParams.get('success');
  const refresh = searchParams.get('refresh');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    // Load existing Stripe Connect status
    loadStripeStatus();
  }, [user, authLoading, router]);

  useEffect(() => {
    if (success === 'true') {
      // User returned from Stripe onboarding
      setOnboardingComplete(true);
      // In production, verify the account status with Stripe
    }
  }, [success]);

  async function loadStripeStatus() {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setAccountId(userData.stripeConnectAccountId || null);
        setOnboardingStatus(userData.stripeConnectStatus || 'pending');
        setOnboardingComplete(userData.stripeConnectOnboardingComplete || false);
      }
    } catch (err: any) {
      console.error('Error loading Stripe status:', err);
    }
  }

  async function handleCreateAccount() {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Create Stripe Connect account
      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create account');
      }

      const data = await response.json();
      const newAccountId = data.accountId;

      // Update Firestore with account ID
      await updateDoc(doc(db, 'users', user.uid), {
        stripeConnectAccountId: newAccountId,
        stripeConnectStatus: 'pending',
        stripeConnectOnboardingComplete: false,
      });

      setAccountId(newAccountId);

      // Immediately start onboarding
      await handleStartOnboarding(newAccountId);
    } catch (err: any) {
      console.error('Error creating account:', err);
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleStartOnboarding(existingAccountId?: string) {
    const targetAccountId = existingAccountId || accountId;
    if (!targetAccountId) return;

    setLoading(true);
    setError(null);

    try {
      // Create onboarding link
      const response = await fetch('/api/stripe/connect/create-onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: targetAccountId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create onboarding link');
      }

      const data = await response.json();
      
      // Redirect to Stripe onboarding
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Error starting onboarding:', err);
      setError(err.message);
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <Link
          href="/vendor/items"
          style={{
            color: '#6E56CF',
            textDecoration: 'none',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          ← Back to My Items
        </Link>
      </div>

      <h1 style={{ marginBottom: '10px', fontSize: '28px' }}>
        Stripe Connect Setup
      </h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Set up your Stripe Connect account to receive payments from marketplace sales.
      </p>

      {error && (
        <div
          style={{
            padding: '15px',
            marginBottom: '20px',
            backgroundColor: '#FEE',
            border: '1px solid #FCC',
            borderRadius: '8px',
            color: '#C00',
          }}
        >
          {error}
        </div>
      )}

      {onboardingComplete && success === 'true' && (
        <div
          style={{
            padding: '15px',
            marginBottom: '20px',
            backgroundColor: '#E8F5E9',
            border: '1px solid #A5D6A7',
            borderRadius: '8px',
            color: '#2E7D32',
          }}
        >
          ✓ Onboarding completed! Your account is being verified.
        </div>
      )}

      <div
        style={{
          backgroundColor: '#FFF',
          border: '1px solid #E0E0E0',
          borderRadius: '12px',
          padding: '30px',
        }}
      >
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ marginBottom: '10px', fontSize: '18px' }}>Account Status</h3>
          
          {!accountId && (
            <div>
              <p style={{ color: '#666', marginBottom: '15px' }}>
                You haven't created a Stripe Connect account yet.
              </p>
              <StatusBadge status="Not Started" color="#999" />
            </div>
          )}

          {accountId && (
            <div>
              <p style={{ color: '#666', marginBottom: '10px' }}>
                <strong>Account ID:</strong> {accountId}
              </p>
              <StatusBadge
                status={
                  onboardingStatus === 'active'
                    ? 'Active'
                    : onboardingStatus === 'restricted'
                    ? 'Restricted'
                    : 'Pending'
                }
                color={
                  onboardingStatus === 'active'
                    ? '#4CAF50'
                    : onboardingStatus === 'restricted'
                    ? '#FF9800'
                    : '#2196F3'
                }
              />
              <p style={{ color: '#666', marginTop: '10px', fontSize: '14px' }}>
                {onboardingStatus === 'active' && 'Your account is active and ready to receive payments.'}
                {onboardingStatus === 'restricted' && 'Your account has some restrictions. Please complete onboarding.'}
                {onboardingStatus === 'pending' && 'Your account is pending verification.'}
              </p>
            </div>
          )}
        </div>

        <div>
          <h3 style={{ marginBottom: '15px', fontSize: '18px' }}>Next Steps</h3>
          
          {!accountId && (
            <button
              onClick={handleCreateAccount}
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: loading ? '#CCC' : '#6E56CF',
                color: '#FFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Creating Account...' : 'Create Stripe Connect Account'}
            </button>
          )}

          {accountId && !onboardingComplete && (
            <button
              onClick={() => handleStartOnboarding()}
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: loading ? '#CCC' : '#6E56CF',
                color: '#FFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Loading...' : refresh ? 'Continue Onboarding' : 'Start Onboarding'}
            </button>
          )}

          {accountId && onboardingComplete && onboardingStatus !== 'active' && (
            <button
              onClick={() => handleStartOnboarding()}
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: loading ? '#CCC' : '#FF9800',
                color: '#FFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Loading...' : 'Update Account Information'}
            </button>
          )}

          {onboardingStatus === 'active' && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ color: '#4CAF50', marginBottom: '15px' }}>
                ✓ Your account is fully set up!
              </p>
              <Link
                href="/vendor/items"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: '#6E56CF',
                  color: '#FFF',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                }}
              >
                Go to My Items
              </Link>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#F5F5F5',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ marginBottom: '10px', fontSize: '16px' }}>About Stripe Connect</h3>
        <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
          Stripe Connect allows you to receive payments directly from customers when they
          purchase your marketplace items. The platform handles payment processing and transfers
          your earnings to your bank account. You'll need to provide some business information
          to comply with financial regulations.
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status, color }: { status: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '6px 12px',
        backgroundColor: `${color}20`,
        color: color,
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '600',
      }}
    >
      {status}
    </span>
  );
}
