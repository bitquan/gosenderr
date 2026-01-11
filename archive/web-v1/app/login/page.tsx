'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  initRecaptchaVerifier,
  sendPhoneVerificationCode,
  signInWithEmail,
  signUpWithEmail,
  auth,
} from '@/lib/firebase/auth';
import { ConfirmationResult } from 'firebase/auth';
import { useAuthUser } from '@/hooks/useAuthUser';
import { getUserDoc } from '@/lib/firebase/firestore';

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email fallback
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const useFallback = process.env.NEXT_PUBLIC_AUTH_FALLBACK_EMAIL === 'true';

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      // Check user doc and redirect accordingly
      getUserDoc(user.uid).then((userDoc) => {
        if (!userDoc || !userDoc.role) {
          router.push('/select-role');
        } else if (userDoc.role === 'customer') {
          router.push('/customer/jobs');
        } else if (userDoc.role === 'driver') {
          router.push('/driver-not-implemented');
        } else {
          router.push('/');
        }
      });
    }
  }, [user, authLoading, router]);

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const verifier = initRecaptchaVerifier('recaptcha-container');
      const result = await sendPhoneVerificationCode(phoneNumber, verifier);
      setConfirmationResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;

    setError('');
    setLoading(true);

    try {
      await confirmationResult.confirm(verificationCode);
      // User state will update via useAuthUser, redirect handled by useEffect
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      // User state will update, redirect handled by useEffect
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (useFallback) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
        <h1>Login to GoSenderr</h1>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
          (Email/Password Fallback Mode)
        </p>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <form onSubmit={handleEmailAuth}>
          <div style={{ marginBottom: '15px' }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          style={{ width: '100%', padding: '10px', background: '#eee' }}
        >
          {isSignUp ? 'Switch to Sign In' : 'Switch to Sign Up'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1>Login to GoSenderr</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!confirmationResult ? (
        <form onSubmit={handleSendCode}>
          <div style={{ marginBottom: '15px' }}>
            <label>Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>

          <div id="recaptcha-container" style={{ marginBottom: '15px' }}></div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '10px' }}
          >
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode}>
          <div style={{ marginBottom: '15px' }}>
            <label>Verification Code</label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '10px' }}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>
      )}
    </div>
  );
}
