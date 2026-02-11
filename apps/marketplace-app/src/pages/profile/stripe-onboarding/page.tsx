/**
 * Stripe Connect Onboarding Page
 * Seller onboarding to receive payments
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { stripeService } from '@/services/stripe.service';
import { useAuth } from '@/hooks/useAuth';
import { doc, updateDoc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function StripeOnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<{
    hasAccount: boolean;
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
  } | null>(null);
  const [sellerProfileReady, setSellerProfileReady] = useState(false);
  const [activatingProfile, setActivatingProfile] = useState(false);

  useEffect(() => {
    checkAccountStatus();
  }, []);

  const checkAccountStatus = async () => {
    const userId = (user as any)?.uid ?? (user as any)?.id;
    if (!userId) return;

    // Ensure sellerProfile exists if user already has listings
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? (userSnap.data() as any) : {};

      if (userData?.sellerProfile) {
        setSellerProfileReady(true);
      }

      if (!userData?.sellerProfile) {
        const listingsQuery = query(
          collection(db, 'marketplaceItems'),
          where('sellerId', '==', userId)
        );
        const listingsSnap = await getDocs(listingsQuery);
        if (!listingsSnap.empty) {
          console.info('Auto-creating sellerProfile from existing listings', {
            userId,
            listings: listingsSnap.size,
            emulator: Boolean(import.meta.env.DEV)
          });
          const payload = {
            sellerProfile: {
              isActive: true,
              activeListings: listingsSnap.size,
              joinedAsSellerAt: serverTimestamp(),
              ratingAvg: 0,
              ratingCount: 0,
            },
            updatedAt: serverTimestamp(),
          };
          if (userSnap.exists()) {
            await updateDoc(userRef, payload);
          } else {
            await setDoc(userRef, payload, { merge: true });
          }
          setSellerProfileReady(true);
        } else {
          console.warn('No listings found for seller profile activation', {
            userId,
            emulator: Boolean(import.meta.env.DEV)
          });
        }
      }
    } catch (err) {
      console.error('Error ensuring seller profile:', err);
    }

    if (!(user as any)?.sellerProfile?.stripeAccountId) {
      setAccountStatus({
        hasAccount: false,
        detailsSubmitted: false,
        chargesEnabled: false
      });
      return;
    }

    try {
      const status = await stripeService.getConnectAccountStatus();
      setAccountStatus({
        hasAccount: true,
        detailsSubmitted: status.detailsSubmitted,
        chargesEnabled: status.chargesEnabled
      });
    } catch (err) {
      console.error('Error checking status:', err);
      setAccountStatus({
        hasAccount: true,
        detailsSubmitted: false,
        chargesEnabled: false
      });
    }
  };

  const handleStartOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!accountStatus?.hasAccount) {
        // Create new account
        const result = await stripeService.createConnectAccount();
        
        // Save account ID to user profile
        if (user) {
          const userRef = doc(db, 'users', (user as any).uid ?? (user as any).id);
          const payload = {
            'sellerProfile.stripeAccountId': result.accountId,
            'sellerProfile.stripeOnboardingComplete': false,
            updatedAt: serverTimestamp()
          };
          try {
            await updateDoc(userRef, payload);
          } catch (error) {
            await setDoc(userRef, payload, { merge: true });
          }
        }
        
        // Redirect to Stripe onboarding
        window.location.href = result.onboardingUrl;
      } else {
        // Get new onboarding link for existing account
        const result = await stripeService.getConnectAccountOnboardingLink();
        window.location.href = result.url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = async () => {
    navigate('/profile/seller-settings');
  };

  const handleActivateSellerProfile = async () => {
    const userId = (user as any)?.uid ?? (user as any)?.id;
    if (!userId) return;

    setActivatingProfile(true);
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        sellerProfile: {
          isActive: true,
          activeListings: 0,
          joinedAsSellerAt: serverTimestamp(),
          ratingAvg: 0,
          ratingCount: 0,
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSellerProfileReady(true);
    } catch (err) {
      console.error('Error activating seller profile:', err);
    } finally {
      setActivatingProfile(false);
    }
  };

  if (!(user as any)?.sellerProfile && !sellerProfileReady) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">
            Seller Profile Required
          </h2>
          <p className="text-yellow-800 mb-4">
            You need to create your first listing to activate your seller profile.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/sell')}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
            >
              Create First Listing
            </button>
            <button
              onClick={handleActivateSellerProfile}
              disabled={activatingProfile}
              className="bg-white border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg hover:bg-yellow-100 disabled:opacity-50"
            >
              {activatingProfile ? 'Activating...' : 'Activate Seller Profile'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-gradient-to-br from-violet-200/80 via-fuchsia-200/65 to-blue-200/70 border border-violet-200/80 rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-purple-100 rounded-full mb-4">
            <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Set Up Payments
          </h1>
          <p className="text-gray-600">
            Connect your bank account to start receiving payments from buyers
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {accountStatus?.chargesEnabled ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              You're All Set! 🎉
            </h2>
            <p className="text-gray-600 mb-6">
              Your Stripe account is connected and you can now receive payments from buyers.
            </p>
            <button
              onClick={handleCompleteSetup}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-semibold"
            >
              Go to Settings
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
                    <span className="text-purple-600 font-semibold">1</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">Connect Stripe Account</h3>
                  <p className="text-gray-600 text-sm">
                    Securely link your bank account through Stripe
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
                    <span className="text-purple-600 font-semibold">2</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">Verify Your Identity</h3>
                  <p className="text-gray-600 text-sm">
                    Provide basic business or personal information (required by law)
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
                    <span className="text-purple-600 font-semibold">3</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-900">Start Selling</h3>
                  <p className="text-gray-600 text-sm">
                    Receive payments directly to your bank account
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-900">Platform Fee: 2.9%</h3>
                  <p className="text-sm text-blue-800 mt-1">
                    We charge a small fee on each sale to maintain the platform. You keep 97.1% of every sale.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartOnboarding}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-4 rounded-lg hover:bg-purple-700 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : accountStatus?.hasAccount ? 'Continue Onboarding' : 'Start Setup'}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Powered by{' '}
              <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                Stripe
              </a>
              {' '}• Your information is secure and encrypted
            </p>
          </>
        )}
      </div>
    </div>
  );
}
