'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { useRouter } from 'next/navigation';
import { GlassCard, LoadingSkeleton } from '@/components/GlassCard';
import { LongHaulRouteDoc, UserDoc } from '@gosenderr/shared';

interface RouteCardProps {
  route: LongHaulRouteDoc & { id: string };
  onAccept: (routeId: string) => void;
  accepting: boolean;
}

function RouteCard({ route, onAccept, accepting }: RouteCardProps) {
  const departureDate = route.scheduledDeparture.toDate();
  const arrivalDate = route.scheduledArrival.toDate();

  return (
    <GlassCard hover className="route-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, marginBottom: '8px', fontSize: '20px' }}>
            {route.originHub.name} → {route.destinationHub.name}
          </h3>
          <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#6b7280' }}>
            <span>📍 {route.distance} miles</span>
            <span>📦 {route.packageCount} packages</span>
            <span>⚖️ {route.totalWeight} lbs</span>
          </div>
        </div>
        <div style={{
          backgroundColor: route.status === 'available' ? '#dcfce7' : '#f3f4f6',
          color: route.status === 'available' ? '#166534' : '#6b7280',
          padding: '4px 12px',
          borderRadius: '16px',
          fontSize: '12px',
          fontWeight: 500,
        }}>
          {route.status}
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '16px', 
        marginBottom: '16px',
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Departure</div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>
            {departureDate.toLocaleDateString()} at {departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Estimated Arrival</div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>
            {arrivalDate.toLocaleDateString()} at {arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingTop: '16px',
        borderTop: '1px solid #e5e7eb',
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Your Earnings</div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#059669' }}>
            ${route.pricing.runnerEarnings.toFixed(2)}
          </div>
        </div>
        <button
          onClick={() => onAccept(route.id)}
          disabled={accepting || route.status !== 'available'}
          style={{
            padding: '12px 24px',
            backgroundColor: route.status === 'available' ? '#3b82f6' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 500,
            cursor: route.status === 'available' ? 'pointer' : 'not-allowed',
          }}
        >
          {accepting ? 'Accepting...' : 'Accept Route'}
        </button>
      </div>
    </GlassCard>
  );
}

export default function AvailableRoutesPage() {
  const { user, loading: authLoading } = useAuthUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [routes, setRoutes] = useState<(LongHaulRouteDoc & { id: string })[]>([]);
  const [filterByHomeHub, setFilterByHomeHub] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadUserAndRoutes();
    }
  }, [user, filterByHomeHub]);

  const loadUserAndRoutes = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load user document
      const userDocRef = doc(db, 'users', user.uid);
      const userSnapshot = await getDoc(userDocRef);
      
      if (!userSnapshot.exists()) {
        setError('User not found');
        return;
      }

      const userData = userSnapshot.data() as UserDoc;
      setUserDoc(userData);

      // Check if user has package runner profile
      if (!userData.packageRunnerProfile) {
        router.push('/runner/onboarding');
        return;
      }

      // Check if profile is approved
      if (userData.packageRunnerProfile.status === 'pending_review') {
        setError('Your profile is under review. You\'ll be able to view routes once approved.');
        setLoading(false);
        return;
      }

      if (userData.packageRunnerProfile.status === 'suspended') {
        setError('Your account is suspended. Please contact support.');
        setLoading(false);
        return;
      }

      // Load available routes
      let routesQuery;
      if (filterByHomeHub && userData.packageRunnerProfile.homeHub?.hubId) {
        routesQuery = query(
          collection(db, 'longHaulRoutes'),
          where('status', '==', 'available'),
          where('originHub.hubId', '==', userData.packageRunnerProfile.homeHub.hubId)
        );
      } else {
        routesQuery = query(
          collection(db, 'longHaulRoutes'),
          where('status', '==', 'available')
        );
      }

      const routesSnapshot = await getDocs(routesQuery);
      const routesData = routesSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as (LongHaulRouteDoc & { id: string })[];

      // Sort by scheduled departure
      routesData.sort((a, b) => 
        a.scheduledDeparture.toMillis() - b.scheduledDeparture.toMillis()
      );

      setRoutes(routesData);
    } catch (err) {
      console.error('Failed to load routes:', err);
      setError('Failed to load routes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRoute = async (routeId: string) => {
    if (!user || !userDoc?.packageRunnerProfile) return;

    setAccepting(true);
    try {
      const routeRef = doc(db, 'longHaulRoutes', routeId);
      
      await updateDoc(routeRef, {
        status: 'claimed',
        runnerId: user.uid,
        runnerName: userDoc.displayName || 'Runner',
        runnerVehicleType: userDoc.packageRunnerProfile.vehicleType,
        claimedAt: serverTimestamp(),
      });

      // Update user's current route
      await updateDoc(doc(db, 'users', user.uid), {
        'packageRunnerProfile.currentRouteId': routeId,
        updatedAt: serverTimestamp(),
      });

      // Reload routes
      await loadUserAndRoutes();
      
      alert('Route accepted successfully!');
    } catch (err) {
      console.error('Failed to accept route:', err);
      alert('Failed to accept route. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <h1>Available Routes</h1>
        <GlassCard>
          <LoadingSkeleton lines={5} />
        </GlassCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <h1>Available Routes</h1>
        <GlassCard>
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            {error}
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '8px' }}>Available Routes</h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            {userDoc?.packageRunnerProfile?.homeHub?.name && (
              <>Home Hub: {userDoc.packageRunnerProfile.homeHub.name}</>
            )}
          </p>
        </div>
        <button
          onClick={() => setFilterByHomeHub(!filterByHomeHub)}
          style={{
            padding: '10px 20px',
            backgroundColor: filterByHomeHub ? '#3b82f6' : '#f3f4f6',
            color: filterByHomeHub ? 'white' : '#374151',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {filterByHomeHub ? '📍 Home Hub Only' : '🌍 All Routes'}
        </button>
      </div>

      {routes.length === 0 ? (
        <GlassCard>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <h3 style={{ margin: 0, marginBottom: '8px' }}>No Available Routes</h3>
            <p style={{ margin: 0, color: '#6b7280' }}>
              Check back later for new routes, or toggle to view all routes.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {routes.map(route => (
            <RouteCard
              key={route.id}
              route={route}
              onAccept={handleAcceptRoute}
              accepting={accepting}
            />
          ))}
        </div>
      )}
    </div>
  );
}
