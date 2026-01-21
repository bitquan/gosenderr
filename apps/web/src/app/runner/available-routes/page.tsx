'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/client';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { LongHaulRoute, RouteStatus } from '@gosenderr/shared';

const ROUTE_TYPE_LABELS: Record<string, string> = {
  long_haul: '🚛 Long Haul',
  hub_to_hub: '🏢 Hub-to-Hub',
  regional: '📍 Regional',
};

interface RouteWithId extends LongHaulRoute {
  id: string;
}

export default function AvailableRoutesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isPackageRunner, setIsPackageRunner] = useState(false);
  const [availableRoutes, setAvailableRoutes] = useState<RouteWithId[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteWithId | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUser(user);

      // Check if user is a package runner
      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', user.uid)));
      
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        const hasRunnerProfile = userData.packageRunnerProfile?.isPackageRunner || false;
        setIsPackageRunner(hasRunnerProfile);

        if (!hasRunnerProfile) {
          // Redirect to onboarding if not a runner yet
          router.push('/runner/onboarding');
          return;
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!isPackageRunner) return;

    // Real-time listener for available routes
    const unsubscribe = onSnapshot(
      query(collection(db, 'longHaulRoutes'), where('status', '==', 'available')),
      (snapshot) => {
        const routes: RouteWithId[] = [];
        snapshot.docs.forEach((doc) => {
          routes.push({
            id: doc.id,
            ...(doc.data() as LongHaulRoute),
          });
        });

        // Sort by distance (shortest first)
        routes.sort((a, b) => a.estimatedDistance - b.estimatedDistance);

        setAvailableRoutes(routes);
      },
      (error) => {
        console.error('Error loading routes:', error);
      }
    );

    return () => unsubscribe();
  }, [isPackageRunner]);

  const handleAcceptRoute = async () => {
    if (!selectedRoute || !currentUser) return;

    setAccepting(true);

    try {
      // Update route to assign to this runner
      await updateDoc(doc(db, 'longHaulRoutes', selectedRoute.id), {
        status: 'assigned' as RouteStatus,
        assignedRunnerId: currentUser.uid,
        assignedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Update runner's active routes
      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', currentUser.uid)));
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        const activeRoutes = userData.packageRunnerProfile?.activeRoutes || [];
        
        await updateDoc(doc(db, 'users', currentUser.uid), {
          'packageRunnerProfile.activeRoutes': [...activeRoutes, selectedRoute.id],
        });
      }

      alert('Route accepted! You can now begin the delivery.');
      setSelectedRoute(null);
    } catch (error) {
      console.error('Failed to accept route:', error);
      alert('Failed to accept route. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isPackageRunner) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '16px' }}>
          Package Runner Required
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          You must be an approved package runner to view available routes.
        </p>
        <button
          onClick={() => router.push('/runner/onboarding')}
          style={{
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Apply to Become a Runner
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ marginBottom: '32px', fontSize: '28px', fontWeight: '600' }}>
        Available Routes ({availableRoutes.length})
      </h1>

      {availableRoutes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p style={{ fontSize: '16px' }}>No available routes at this time. Check back soon!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px' }}>
          {/* List of available routes */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {availableRoutes.map((route) => (
                <button
                  key={route.id}
                  onClick={() => setSelectedRoute(route)}
                  style={{
                    padding: '16px',
                    background: selectedRoute?.id === route.id ? '#eff6ff' : 'white',
                    border: selectedRoute?.id === route.id ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    {ROUTE_TYPE_LABELS[route.type]}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                    {route.origin.address.substring(0, 40)}... → {route.destination.address.substring(0, 40)}...
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#9ca3af' }}>
                    <span>📏 {route.estimatedDistance.toFixed(0)} mi</span>
                    <span>⏱️ {Math.floor(route.estimatedDuration / 60)}h {route.estimatedDuration % 60}m</span>
                    <span>📦 {route.packageIds.length} pkgs</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Route details */}
          <div>
            {selectedRoute ? (
              <div
                style={{
                  padding: '24px',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                }}
              >
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                  {ROUTE_TYPE_LABELS[selectedRoute.type]}
                </h2>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    background: '#dbeafe',
                    color: '#1e40af',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '20px',
                  }}
                >
                  {selectedRoute.status.toUpperCase()}
                </div>

                {/* Route Overview */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                    Route Overview
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Distance</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {selectedRoute.estimatedDistance.toFixed(1)} miles
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Estimated Duration</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {Math.floor(selectedRoute.estimatedDuration / 60)}h {selectedRoute.estimatedDuration % 60}m
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Packages</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {selectedRoute.packageIds.length} packages
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Stops</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {selectedRoute.stops.length} stops
                      </div>
                    </div>
                  </div>
                </div>

                {/* Origin & Destination */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                    Origin & Destination
                  </h3>
                  <div
                    style={{
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                      📍 Origin {selectedRoute.origin.hubId && '(Hub)'}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>
                      {selectedRoute.origin.address}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                      🎯 Destination {selectedRoute.destination.hubId && '(Hub)'}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>
                      {selectedRoute.destination.address}
                    </div>
                  </div>
                </div>

                {/* Stops */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                    Route Stops ({selectedRoute.stops.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedRoute.stops.slice(0, 5).map((stop, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '12px',
                          background: '#f9fafb',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                      >
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          Stop {stop.sequenceNumber + 1}: {stop.stopType === 'pickup' ? '📦 Pickup' : '📍 Dropoff'}
                          {stop.hubId && ' (Hub)'}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '12px' }}>
                          {stop.location.address}
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '4px' }}>
                          {stop.packages.length} package{stop.packages.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ))}
                    {selectedRoute.stops.length > 5 && (
                      <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                        + {selectedRoute.stops.length - 5} more stops
                      </div>
                    )}
                  </div>
                </div>

                {/* Accept Button */}
                <button
                  onClick={handleAcceptRoute}
                  disabled={accepting}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: accepting ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: accepting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {accepting ? 'Accepting Route...' : '✅ Accept This Route'}
                </button>
              </div>
            ) : (
              <div
                style={{
                  padding: '40px',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  textAlign: 'center',
                  color: '#6b7280',
                }}
              >
                <p style={{ fontSize: '16px' }}>
                  Select a route from the list to view details
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
