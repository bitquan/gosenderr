import { useEffect, useRef, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigation } from '@/hooks/useNavigation';
import { useUserDoc } from '@/hooks/v2/useUserDoc';
import { NavigationHeader } from '@/components/navigation/NavigationHeader';
import { MapboxMap, MapboxMapHandle } from '@/components/v2/MapboxMap';
import type { RouteSegment } from '@/lib/navigation/types';
import type mapboxgl from 'mapbox-gl';

export default function ActiveNavigationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef<MapboxMapHandle>(null);
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [orientationPermission, setOrientationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const orientationListenerActive = useRef(false);
  const lastBearing = useRef<number>(0);
  
  const {
    isNavigating,
    currentJob,
    currentStep,
    distanceToNextTurn,
    estimatedTimeRemaining,
    cameraMode,
    stopNavigation,
    toggleCameraMode,
    currentRoute,
  } = useNavigation();
  
  const { userDoc } = useUserDoc();
  
  const jobId = location.state?.jobId;

  // Generate route segments from current route
  const routeSegments: RouteSegment[] = useMemo(() => {
    if (!currentRoute) {
      console.log('🗺️ No current route');
      return [];
    }

    // Use the top-level geometry which has all coordinates
    const coordinates = currentRoute.geometry?.coordinates || [];

    console.log('🗺️ Navigation route segments:', {
      hasRoute: !!currentRoute,
      hasGeometry: !!currentRoute.geometry,
      numCoordinates: coordinates.length,
      firstCoord: coordinates[0],
      lastCoord: coordinates[coordinates.length - 1]
    });

    if (coordinates.length === 0) {
      console.warn('⚠️ Route has no coordinates!');
      return [];
    }

    return [{
      coordinates: coordinates,
      color: '#6E56CF', // purple for active navigation
      type: 'navigation' as const,
    }];
  }, [currentRoute]);

  const lastCenterAt = useRef(0);
  const lastCenter = useRef<[number, number] | null>(null);

  const applyFollowCamera = (
    map: mapboxgl.Map,
    loc: { lat: number; lng: number },
    options: { force?: boolean } = {}
  ) => {
    const now = Date.now();
    const minInterval = 350;
    const prev = lastCenter.current;
    const moved = !prev || Math.hypot(prev[0] - loc.lng, prev[1] - loc.lat) > 0.00005;

    if (!options.force && !moved && now - lastCenterAt.current < minInterval) {
      return;
    }

    lastCenterAt.current = now;
    lastCenter.current = [loc.lng, loc.lat];

    map.easeTo({
      center: [loc.lng, loc.lat],
      zoom: 19,
      pitch: 65,
      duration: 700,
      easing: (t) => t * (2 - t),
      essential: true
    });
  };

  const applyOverviewCamera = (map: mapboxgl.Map) => {
    const bounds = new (window as any).mapboxgl.LngLatBounds();

    if (routeSegments.length > 0) {
      routeSegments.forEach(segment => {
        segment.coordinates.forEach(coord => {
          bounds.extend(coord);
        });
      });
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: 80, right: 80 },
        duration: 800,
        bearing: 0,
        pitch: 0
      });
    }
  };

  // Follow mode: recenter on courier location
  useEffect(() => {
    if (cameraMode !== 'follow' || !mapRef.current || !userDoc?.courierProfile?.currentLocation) return;
    const map = mapRef.current.getMap();
    if (!map) return;
    applyFollowCamera(map, userDoc.courierProfile.currentLocation);
  }, [cameraMode, userDoc?.courierProfile?.currentLocation]);

  // Follow mode: update bearing only
  useEffect(() => {
    if (cameraMode !== 'follow' || !mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;
    const delta = Math.abs(deviceHeading - lastBearing.current);
    if (delta < 1) return;
    lastBearing.current = deviceHeading;
    map.easeTo({
      bearing: deviceHeading,
      duration: 240,
      easing: (t) => t * (2 - t),
      essential: true
    });
  }, [deviceHeading, cameraMode]);

  // Overview mode: fit to route on mode/route changes
  useEffect(() => {
    if (cameraMode !== 'overview' || !mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;
    applyOverviewCamera(map);
  }, [cameraMode, routeSegments]);

  // Request device orientation permission and start tracking
  const requestOrientationPermission = async () => {
    console.log('📱 Requesting device orientation permission...');
    
    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        console.log('📱 Permission result:', permission);
        setOrientationPermission(permission);
        
        if (permission === 'granted') {
          startOrientationTracking();
        }
      } catch (error) {
        console.error('❌ Error requesting permission:', error);
        setOrientationPermission('denied');
      }
    } else {
      // Non-iOS or older iOS - no permission needed
      console.log('📱 No permission needed, starting tracking');
      setOrientationPermission('granted');
      startOrientationTracking();
    }
  };

  const startOrientationTracking = () => {
    if (orientationListenerActive.current) return;
    
    const handleOrientation = (event: DeviceOrientationEvent) => {
      // iOS provides compass heading directly
      const heading = (event as any).webkitCompassHeading || 
                     // Android: calculate from alpha (0-360, where 0 is north)
                     (event.alpha !== null ? 360 - event.alpha : 0);
      
      setDeviceHeading(heading);
      
      // Bearing updates are handled in an effect to avoid camera jitter
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    orientationListenerActive.current = true;
    console.log('📱 Orientation tracking started');
  };

  // Track device orientation for map rotation
  useEffect(() => {
    console.log('🔄 Orientation effect - permission state:', orientationPermission);
    
    // Auto-request permission when component mounts (only on iOS devices that need it)
    if (orientationPermission === 'prompt') {
      console.log('📱 Checking if permission needed...');
      
      // Check if we need permission (iOS 13+)
      if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
        console.log('📱 iOS device detected - permission required, showing prompt');
        // Don't auto-request, let user click the button
      } else {
        // Non-iOS or older iOS - start tracking immediately
        console.log('📱 Non-iOS device - no permission needed');
        setOrientationPermission('granted');
        startOrientationTracking();
      }
    }

    return () => {
      if (orientationListenerActive.current) {
        window.removeEventListener('deviceorientation', () => {}, true);
        orientationListenerActive.current = false;
      }
    };
  }, [orientationPermission]);

  // Redirect if not navigating
  useEffect(() => {
    if (!isNavigating && !jobId) {
      console.warn('⚠️ Not in navigation mode, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isNavigating, jobId, navigate]);

  // Handle exit navigation
  const handleExit = () => {
    stopNavigation();
  };

  // Handle camera mode toggle
  const switchCameraMode = (mode: 'follow' | 'overview') => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (mode === 'overview') {
      applyOverviewCamera(map);
      if (cameraMode !== 'overview') {
        toggleCameraMode();
      }
      return;
    }

    if (cameraMode !== 'follow') {
      toggleCameraMode();
    }

    if (userDoc?.courierProfile?.currentLocation) {
      applyFollowCamera(map, userDoc.courierProfile.currentLocation, { force: true });
      map.easeTo({
        bearing: deviceHeading,
        duration: 300,
        easing: (t) => t * (2 - t),
        essential: true
      });
    }
  };

  const handleToggleCamera = () => {
    switchCameraMode(cameraMode === 'follow' ? 'overview' : 'follow');
  };

  if (!currentJob) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Loading navigation...</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalDistance = currentRoute?.distance || 0;

  console.log('🎨 Rendering navigation page with:', {
    hasJob: !!currentJob,
    hasRoute: !!currentRoute,
    numSegments: routeSegments.length,
    segmentCoords: routeSegments[0]?.coordinates?.length,
    orientationPermission,
    needsPermissionPrompt: orientationPermission === 'prompt'
  });

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-gray-900" style={{ touchAction: 'none' }}>
      {/* Navigation Header (Floating at top) */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="pointer-events-auto">
          <NavigationHeader
            currentStep={currentStep}
            distanceToTurn={distanceToNextTurn}
            timeRemaining={estimatedTimeRemaining}
            totalDistance={totalDistance}
            onExit={handleExit}
          />
        </div>
      </div>

      {/* Full-Screen Map */}
      <div className="absolute inset-0">
        <MapboxMap
          ref={mapRef}
          pickup={currentJob.pickup}
          dropoff={currentJob.dropoff}
          courierLocation={userDoc?.courierProfile?.currentLocation || null}
          routeSegments={routeSegments}
          height="100%"
        />
      </div>

      {/* Camera Mode Toggle - pill segmented control */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur rounded-full shadow-lg p-1">
          <button
            onClick={() => switchCameraMode('follow')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              cameraMode === 'follow'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Follow
          </button>
          <button
            onClick={() => switchCameraMode('overview')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              cameraMode === 'overview'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Overview
          </button>
        </div>
      </div>

      {/* Navigation Active Indicator */}
      <div className="absolute top-4 left-4 z-10 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Navigating
        </div>
      </div>

      {/* Orientation Permission Prompt */}
      {orientationPermission === 'prompt' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4">
          <div className="text-center">
            <div className="text-4xl mb-3">📱</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Enable Compass</h3>
            <p className="text-sm text-gray-600 mb-4">
              Allow compass access to rotate the map as you turn your phone for better navigation.
            </p>
            <button
              onClick={requestOrientationPermission}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Enable Compass
            </button>
            <button
              onClick={() => setOrientationPermission('denied')}
              className="w-full mt-2 px-6 py-2 text-gray-600 text-sm"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Backdrop for permission prompt */}
      {orientationPermission === 'prompt' && (
        <div className="absolute inset-0 bg-black/50 z-40" />
      )}
    </div>
  );
}
