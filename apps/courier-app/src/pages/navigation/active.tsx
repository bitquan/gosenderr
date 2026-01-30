import { useEffect, useRef, useMemo, useState, useCallback, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigation } from '@/hooks/useNavigation';
import { useUserDoc } from '@/hooks/v2/useUserDoc';
import { NavigationHeader } from '@/components/navigation/NavigationHeader';
import { MapboxMap, MapboxMapHandle } from '@/components/v2/MapboxMap';
import { calcMiles } from '@/lib/v2/pricing';
import type { RouteSegment } from '@/lib/navigation/types';
import type mapboxgl from 'mapbox-gl';

function ActiveNavigationPage() {
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
    goToNextStep,
    updateDistance,
    updateETA,
    remainingSteps,
  } = useNavigation();
  
  const { userDoc } = useUserDoc();
  
  const jobId = location.state?.jobId;

  // Generate route segments from current route
  const routeSegments: RouteSegment[] = useMemo(() => {
    if (!currentRoute) {
      console.log('🗺️ No current route available');
      return [];
    }

    // Use the top-level geometry which has all coordinates
    const coordinates = currentRoute.geometry?.coordinates || [];

    // Only log on actual route change, not on every render
    if (import.meta.env.DEV) {
      // @ts-expect-error tracking route changes
      if (!window.__lastRouteId || window.__lastRouteId !== currentRoute.id) {
        console.log('🗺️ Navigation route segments updated:', {
          numCoordinates: coordinates.length,
          distance: currentRoute.distance,
          duration: currentRoute.duration
        });
        // @ts-expect-error tracking route changes
        window.__lastRouteId = currentRoute.id;
      }
    }

    if (coordinates.length === 0) {
      console.warn('⚠️ Route has no coordinates!');
      return [];
    }

    const segment: RouteSegment = {
      coordinates: coordinates,
      color: '#6E56CF', // purple for active navigation
      type: 'navigation' as const,
    };

    return [segment];
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
      easing: (t: number) => t * (2 - t),
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
      // If bounds are tiny (short route), prefer a stable zoom instead of extreme zoom-in
      const east = bounds.getEast();
      const west = bounds.getWest();
      const north = bounds.getNorth();
      const south = bounds.getSouth();
      const lngDiff = Math.abs(east - west);
      const latDiff = Math.abs(north - south);
      const smallThreshold = 0.002; // ~200m box

      if (lngDiff < smallThreshold && latDiff < smallThreshold) {
        // Small area: center on route midpoint and use a sensible zoom level
        const coords = routeSegments[0].coordinates;
        const mid = coords[Math.floor(coords.length / 2)];
        map.easeTo({
          center: [mid[0], mid[1]],
          zoom: 15,
          bearing: 0,
          pitch: 0,
          duration: 700,
          essential: true
        });
        return;
      }

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
      easing: (t: number) => t * (2 - t),
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

  // Automatic step advancement based on location
  useEffect(() => {
    if (!isNavigating || !currentStep || !userDoc?.courierProfile?.currentLocation) {
      return;
    }

    const courierLocation = userDoc.courierProfile.currentLocation;
    const stepLocation = currentStep.maneuver.location;

    // Calculate distance to current step in meters
    const distanceToStep = calcMiles(
      { lat: courierLocation.lat, lng: courierLocation.lng },
      { lat: stepLocation[1], lng: stepLocation[0] } // Mapbox uses [lng, lat]
    ) * 1609.34; // Convert miles to meters

    // Update distance to next turn
    updateDistance(distanceToStep);

    // Advance to next step if within 30 meters of current step
    const STEP_COMPLETION_THRESHOLD = 30; // meters
    if (distanceToStep <= STEP_COMPLETION_THRESHOLD) {
      console.log('🎯 Step completed, advancing to next step', {
        stepInstruction: currentStep.maneuver.instruction,
        distanceToStep,
        threshold: STEP_COMPLETION_THRESHOLD
      });
      goToNextStep();
    }
  }, [isNavigating, currentStep, userDoc?.courierProfile?.currentLocation, goToNextStep, updateDistance]);

  // Voice guidance for turn-by-turn navigation
  const speakInstruction = useCallback((instruction: string, distance?: number) => {
    if (!('speechSynthesis' in window)) {
      console.log('🔊 Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance();
    utterance.text = distance ? `${instruction} in ${Math.round(distance)} meters` : instruction;
    utterance.volume = 0.8;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    speechSynthesis.speak(utterance);
  }, []);

  // Speak instructions when step changes
  useEffect(() => {
    if (currentStep && isNavigating) {
      const instruction = currentStep.maneuver.instruction;
      speakInstruction(instruction, distanceToNextTurn);
    }
  }, [currentStep, isNavigating, distanceToNextTurn, speakInstruction]);

  // Handle arrival at destination
  const { uid } = (window as any).__TEST_AUTH__ || { uid: null };

  const handleArrival = useCallback(async () => {
    if (!currentJob) return;

    console.log('🎉 Arrived at destination', { jobId: currentJob.id });
    speakInstruction('You have arrived at your destination');

    try {
      // Mark arrived at dropoff on the server; keep the UI in-map
      // Use an optimistic UI approach: show a confirmation banner
      // Import updateJobStatus lazily to avoid circular deps
      const { updateJobStatus } = await import('@/lib/v2/jobs');
      await updateJobStatus(currentJob.id, 'arrived_dropoff', (window as any).__TEST_AUTH__?.uid || null);
      alert('Marked as arrived at dropoff. Please confirm delivery to complete the job.');
    } catch (err: any) {
      console.error('Failed to mark arrival:', err);
      alert(err.message || 'Failed to mark arrival at dropoff');
    }
  }, [currentJob, speakInstruction]);

  // Pickup flow helpers
  const handleArrivedPickup = useCallback(async () => {
    if (!currentJob) return;
    speakInstruction('Arrived at pickup');

    try {
      const { updateJobStatus } = await import('@/lib/v2/jobs');
      await updateJobStatus(currentJob.id, 'arrived_pickup', (window as any).__TEST_AUTH__?.uid || null);
      alert('Marked as arrived at pickup.');
    } catch (err: any) {
      console.error('Failed to mark arrived at pickup:', err);
      alert(err.message || 'Failed to mark arrival at pickup');
    }
  }, [currentJob, speakInstruction]);

  const handleMarkPickedUp = useCallback(async () => {
    if (!currentJob) return;
    speakInstruction('Package picked up');

    try {
      const { updateJobStatus } = await import('@/lib/v2/jobs');
      await updateJobStatus(currentJob.id, 'picked_up', (window as any).__TEST_AUTH__?.uid || null);
      alert('Marked package as picked up.');
    } catch (err: any) {
      console.error('Failed to mark package picked up:', err);
      alert(err.message || 'Failed to mark package as picked up');
    }
  }, [currentJob, speakInstruction]);

  // Check if navigation is complete (no more steps)
  const isNavigationComplete = isNavigating && !currentStep && remainingSteps.length === 0;

  // Request device orientation permission and start tracking
  const requestOrientationPermission = async () => {
    console.log('📱 Requesting device orientation permission...');
    
    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        console.log('📱 Permission result:', permission);
        setOrientationPermission(permission);
        
        if (permission === 'granted') {
          // Store permission grant in localStorage to avoid re-prompting on resume
          try {
            localStorage.setItem('orientation_permission_granted', 'true');
          } catch (e) {
            console.warn('Could not store permission state');
          }
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
    
    // Check if permission was already granted in a previous session
    if (orientationPermission === 'prompt') {
      try {
        const wasGranted = localStorage.getItem('orientation_permission_granted');
        if (wasGranted) {
          console.log('📱 Permission previously granted, restoring...');
          setOrientationPermission('granted');
          startOrientationTracking();
          return;
        }
      } catch (e) {
        console.warn('Could not check permission state from localStorage');
      }
      
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

  // Redirect if not navigating and no jobId provided
  useEffect(() => {
    if (!isNavigating && !jobId) {
      console.warn('⚠️ Not in navigation mode, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isNavigating, jobId, navigate]);

  // Emergency: if we have a currentJob but no route, log it for debugging
  useEffect(() => {
    if (currentJob && !currentRoute) {
      console.warn('⚠️ WARNING: currentJob exists but no currentRoute!', {
        jobId: currentJob.id,
        status: currentJob.status,
        hasContextRoute: !!currentRoute
      });
    }
  }, [currentJob, currentRoute]);

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
        easing: (t: number) => t * (2 - t),
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

  // Only log in dev mode, throttled
  if (import.meta.env.DEV) {
    // @ts-expect-error throttled logging
    window.__navPageRenderCount = (window.__navPageRenderCount || 0) + 1;
    // @ts-expect-error throttled logging
    if (window.__navPageRenderCount % 10 === 0) {
      console.log('🎨 [Every 10 renders] Navigation page state:', {
        hasJob: !!currentJob,
        hasRoute: !!currentRoute,
        numSegments: routeSegments.length,
        // @ts-expect-error throttled logging
        renderCount: window.__navPageRenderCount
      });
    }
  }

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
          courierLocation={userDoc?.courierProfile?.currentLocation as any || null}
          routeSegments={routeSegments}
          height="100%"
          onMapLoad={(map) => {
            try {
              // When the map first loads, ensure camera mode is applied immediately
              if (cameraMode === 'follow' && userDoc?.courierProfile?.currentLocation) {
                applyFollowCamera(map, userDoc.courierProfile.currentLocation, { force: true });
                map.easeTo({ bearing: deviceHeading, duration: 300, essential: true });
              }

              if (cameraMode === 'overview') {
                applyOverviewCamera(map);
              }
            } catch (err) {
              console.error('Error applying initial camera on map load', err);
            }
          }}
        />
      </div>

{/* Camera Mode Toggle or Arrival / Pickup Buttons */}
      {isNavigationComplete ? (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={handleArrival}
            className="px-8 py-4 bg-green-600 text-white rounded-full text-lg font-bold shadow-lg hover:bg-green-700 transition-colors"
          >
            🎉 Arrived at Destination
          </button>
        </div>
      ) : (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-3 bg-white/95 backdrop-blur rounded-full shadow-lg p-2">
            {/* Pickup actions vary by job status */}
            {currentJob.status === 'enroute_pickup' && (
              <button
                onClick={handleArrivedPickup}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                Arrived at Pickup
              </button>
            )}

            {currentJob.status === 'arrived_pickup' && (
              <button
                onClick={handleMarkPickedUp}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                Mark Package Picked Up
              </button>
            )}

            {/* Default camera controls */}
            <div className="flex items-center gap-1">
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
        </div>
      )}

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

export default memo(ActiveNavigationPage);

