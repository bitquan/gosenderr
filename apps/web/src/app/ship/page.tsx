'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { useUserRole } from '@/hooks/v2/useUserRole';
import { useFeatureFlag } from '@/hooks/v2/useFeatureFlag';

export default function ShipPage() {
  const router = useRouter();
  const { uid, loading: authLoading } = useAuthUser();
  const { role, loading: roleLoading } = useUserRole();
  const { enabled: packageShippingEnabled, loading: flagLoading } = useFeatureFlag(
    'customer.packageShipping'
  );

  useEffect(() => {
    if (!authLoading && !uid) {
      router.push('/login');
    }
  }, [uid, authLoading, router]);

  if (authLoading || roleLoading || flagLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-700">Loading...</div>
        </div>
      </div>
    );
  }

  if (!uid) {
    return null;
  }

  if (!packageShippingEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Feature Not Available</h1>
          <p className="text-gray-600 mb-6">
            The package shipping feature is currently disabled. Please check back later or
            contact support if you believe this is an error.
          </p>
          <Link
            href={role === 'courier' ? '/courier/dashboard' : '/customer/jobs'}
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📦 Package Shipping</h1>
          <p className="text-gray-600">
            Create and manage your package shipments with our delivery network
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Shipment</h2>
          <p className="text-gray-600 mb-6">
            This feature is now enabled! You can create package delivery jobs through our
            standard job creation flow.
          </p>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Standard Delivery</h3>
              <p className="text-gray-600 text-sm mb-3">
                Schedule pickup and delivery for your packages. Choose package size, add
                special requirements, and upload photos.
              </p>
              <Link
                href="/customer/jobs/new"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Delivery Job →
              </Link>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">View My Shipments</h3>
              <p className="text-gray-600 text-sm mb-3">
                Track all your active and completed package deliveries in one place.
              </p>
              <Link
                href="/customer/jobs"
                className="inline-block bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                View All Jobs →
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-blue-900 mb-2">✨ Beta Feature</h2>
          <p className="text-blue-800 text-sm">
            This feature is currently in beta testing. We appreciate your feedback to help
            us improve the experience. Please report any issues you encounter.
          </p>
        </div>
      </div>
    </div>
  );
}
