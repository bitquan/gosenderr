'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { useUserRole } from '@/hooks/v2/useUserRole';
import { useFeatureFlag } from '@/hooks/v2/useFeatureFlag';
import { useOpenJobs } from '@/hooks/v2/useOpenJobs';

export default function CourierRoutesPage() {
  const router = useRouter();
  const { uid, loading: authLoading } = useAuthUser();
  const { role, loading: roleLoading } = useUserRole();
  const { enabled: routesEnabled, loading: flagLoading } = useFeatureFlag('delivery.routes');
  const { jobs, loading: jobsLoading } = useOpenJobs();

  useEffect(() => {
    if (!authLoading && !roleLoading && (!uid || role !== 'courier')) {
      router.push('/login');
    }
  }, [uid, role, authLoading, roleLoading, router]);

  if (authLoading || roleLoading || flagLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-700">Loading...</div>
        </div>
      </div>
    );
  }

  if (!uid || role !== 'courier') {
    return null;
  }

  if (!routesEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Feature Not Available</h1>
          <p className="text-gray-600 mb-6">
            The courier routes feature is currently disabled. Please check back later or
            contact support if you believe this is an error.
          </p>
          <Link
            href="/courier/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const availableRoutes = jobs || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🗺️ Available Routes</h1>
          <p className="text-gray-600">
            Browse and accept delivery routes in your service area
          </p>
        </div>

        {jobsLoading ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-gray-600">Loading routes...</div>
          </div>
        ) : availableRoutes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Routes Available</h2>
            <p className="text-gray-600 mb-6">
              There are no delivery routes available in your area at the moment. Check back
              soon!
            </p>
            <Link
              href="/courier/dashboard"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div>
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-700 font-semibold">
                    {availableRoutes.length} route{availableRoutes.length !== 1 ? 's' : ''}{' '}
                    available
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableRoutes.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                        OPEN
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        ${job.pricing?.courierEarnings?.toFixed(2) || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">estimated</div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Pickup</div>
                      <div className="text-sm text-gray-700">
                        📍 {job.pickup?.address?.substring(0, 40) || 'Address masked'}...
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Dropoff</div>
                      <div className="text-sm text-gray-700">
                        📍 {job.dropoff?.address?.substring(0, 40) || 'Address masked'}...
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">
                        Distance: ~{job.estimatedDistance?.toFixed(1) || 'N/A'} mi
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/courier/jobs/${job.id}`}
                    className="block w-full bg-blue-600 text-white text-center px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    View Details →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h2 className="text-lg font-bold text-blue-900 mb-2">✨ Beta Feature</h2>
          <p className="text-blue-800 text-sm mb-3">
            This feature is currently in beta testing. The routes view provides an
            alternative way to browse available delivery jobs.
          </p>
          <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside">
            <li>Routes are displayed based on your service area</li>
            <li>Accept routes through the job details page</li>
            <li>Real-time updates when new routes become available</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
