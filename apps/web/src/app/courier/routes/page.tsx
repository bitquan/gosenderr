'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { JobDoc } from '@/lib/v2/types';
import { RouteDetailsModal, RouteDetails, RouteStop } from '@/components/modals/RouteDetailsModal';

export default function CourierRoutesPage() {
  const { uid } = useAuthUser();
  const [routes, setRoutes] = useState<RouteDetails[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRoutes() {
      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        // Load all assigned jobs for the courier
        const jobsRef = collection(db, 'jobs');
        const q = query(
          jobsRef,
          where('courierUid', '==', uid),
          where('status', 'in', ['assigned', 'enroute_pickup', 'arrived_pickup', 'picked_up', 'enroute_dropoff', 'arrived_dropoff'])
        );
        
        const snapshot = await getDocs(q);
        const jobs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as JobDoc & { id: string }));

        // Group jobs into routes (in a real app, this would be based on route optimization)
        // For now, we'll create a single route per job
        const routesList: RouteDetails[] = jobs.map((job, index) => {
          const stops: RouteStop[] = [
            {
              id: `${job.id}-pickup`,
              type: 'pickup',
              location: job.pickup,
              sequence: 1,
              status: ['picked_up', 'enroute_dropoff', 'arrived_dropoff', 'completed'].includes(job.status)
                ? 'completed'
                : 'pending',
              estimatedTime: 'Now',
            },
            {
              id: `${job.id}-dropoff`,
              type: 'dropoff',
              location: job.dropoff,
              sequence: 2,
              status: job.status === 'completed' ? 'completed' : 'pending',
              estimatedTime: '+30 min',
            },
          ];

          const completedStops = stops.filter(s => s.status === 'completed').length;

          return {
            id: job.id,
            name: `Route ${index + 1} - ${job.id.substring(0, 8)}`,
            totalStops: stops.length,
            completedStops,
            estimatedDuration: 30,
            totalDistance: calculateDistance(job.pickup, job.dropoff),
            stops,
          };
        });

        setRoutes(routesList);
        setLoading(false);
      } catch (err) {
        console.error('Error loading routes:', err);
        setLoading(false);
      }
    }

    loadRoutes();
  }, [uid]);

  const handleViewRoute = (route: RouteDetails) => {
    setSelectedRoute(route);
    setIsModalOpen(true);
  };

  const calculateDistance = (
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number => {
    const R = 3959; // Earth radius in miles
    const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
    const dLon = ((point2.lng - point1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.lat * Math.PI) / 180) *
        Math.cos((point2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  if (!uid) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
          Authentication Required
        </h2>
        <p style={{ fontSize: '16px', color: '#6b7280' }}>
          Please log in to view your routes.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading routes...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
          My Routes
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          View and manage your delivery routes
        </p>
      </div>

      {routes.length === 0 ? (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>
            No Active Routes
          </h2>
          <p style={{ fontSize: '16px', color: '#6b7280' }}>
            You don't have any active delivery routes at the moment.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {routes.map((route) => (
            <div
              key={route.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px', color: '#111827' }}>
                    {route.name}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    {route.completedStops} of {route.totalStops} stops completed
                  </p>
                </div>
                <button
                  onClick={() => handleViewRoute(route)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  View Details
                </button>
              </div>

              {/* Route Stats */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Distance
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                    {route.totalDistance.toFixed(1)} mi
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Duration
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                    {route.estimatedDuration} min
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Progress
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                    {Math.round((route.completedStops / route.totalStops) * 100)}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginTop: '16px' }}>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${(route.completedStops / route.totalStops) * 100}%`,
                      height: '100%',
                      backgroundColor: '#10b981',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Route Details Modal */}
      <RouteDetailsModal
        route={selectedRoute}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRoute(null);
        }}
      />
    </div>
  );
}
