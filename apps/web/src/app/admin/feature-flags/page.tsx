'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { useUserRole } from '@/hooks/v2/useUserRole';
import { useFeatureFlags } from '@/hooks/v2/useFeatureFlags';
import { db } from '@/lib/firebase/firestore';
import { FeatureFlagDoc } from '@gosenderr/shared';

export default function FeatureFlagsPage() {
  const router = useRouter();
  const { uid, loading: authLoading } = useAuthUser();
  const { role, loading: roleLoading } = useUserRole();
  const { flags, loading: flagsLoading } = useFeatureFlags();
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !roleLoading && (!uid || role !== 'admin')) {
      router.push('/login');
    }
  }, [uid, role, authLoading, roleLoading, router]);

  const handleToggle = async (flag: FeatureFlagDoc) => {
    if (!uid || !db) return;

    setUpdating(flag.key);
    try {
      const flagRef = doc(db, 'featureFlags', flag.key);
      await setDoc(
        flagRef,
        {
          enabled: !flag.enabled,
          updatedAt: Timestamp.now(),
          updatedBy: uid,
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error toggling feature flag:', error);
      alert('Failed to toggle feature flag. Check console for details.');
    } finally {
      setUpdating(null);
    }
  };

  const initializeFlags = async () => {
    if (!uid || !db) return;

    const defaultFlags: Omit<FeatureFlagDoc, 'createdAt' | 'updatedAt'>[] = [
      {
        key: 'customer.packageShipping',
        category: 'customer',
        enabled: false,
        description: 'Enable package shipping feature for customers (/ship page)',
        updatedBy: uid,
      },
      {
        key: 'delivery.routes',
        category: 'delivery',
        enabled: false,
        description: 'Enable courier routes feature (/courier/routes page)',
        updatedBy: uid,
      },
    ];

    try {
      for (const flag of defaultFlags) {
        const flagRef = doc(db, 'featureFlags', flag.key);
        await setDoc(flagRef, {
          ...flag,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      alert('Feature flags initialized successfully!');
    } catch (error) {
      console.error('Error initializing flags:', error);
      alert('Failed to initialize flags. Check console for details.');
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-700">Loading...</div>
        </div>
      </div>
    );
  }

  if (!uid || role !== 'admin') {
    return null;
  }

  const groupedFlags: Record<string, FeatureFlagDoc[]> = {};
  if (flags) {
    flags.forEach((flag) => {
      if (!groupedFlags[flag.category]) {
        groupedFlags[flag.category] = [];
      }
      groupedFlags[flag.category].push(flag);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Feature Flags</h1>
          <p className="text-gray-600 mb-4">
            Enable or disable features for beta testing and gradual rollout
          </p>

          {(!flags || flags.length === 0) && !flagsLoading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 mb-3">
                No feature flags found. Initialize default flags?
              </p>
              <button
                onClick={initializeFlags}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Initialize Default Flags
              </button>
            </div>
          )}
        </div>

        {flagsLoading && (
          <div className="text-center py-8">
            <div className="text-gray-600">Loading flags...</div>
          </div>
        )}

        {flags && flags.length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedFlags).map(([category, categoryFlags]) => (
              <div key={category} className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 capitalize">
                  {category} Features
                </h2>
                <div className="space-y-4">
                  {categoryFlags.map((flag) => (
                    <div
                      key={flag.key}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {flag.key}
                        </h3>
                        <p className="text-gray-600 text-sm mb-2">{flag.description}</p>
                        {flag.updatedBy && (
                          <p className="text-xs text-gray-500">
                            Last updated by: {flag.updatedBy}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggle(flag)}
                        disabled={updating === flag.key}
                        className={`
                          ml-4 px-6 py-3 rounded-lg font-semibold transition-all
                          ${
                            flag.enabled
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                          }
                          ${updating === flag.key ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        {updating === flag.key
                          ? 'Updating...'
                          : flag.enabled
                          ? '✓ Enabled'
                          : '✗ Disabled'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
