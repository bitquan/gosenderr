import { useEffect, useRef, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigation } from '@/hooks/useNavigation';
import { useUserDoc } from '@/hooks/v2/useUserDoc';
import { NavigationHeader } from '@/components/navigation/NavigationHeader';
import { MapboxMap, MapboxMapHandle } from '@/components/v2/MapboxMap';
import type { RouteSegment } from '@/lib/navigation/types';
import { fetchDirections } from '@/lib/navigation/directions';
import type { RouteData } from '@/lib/navigation/types';
import type mapboxgl from 'mapbox-gl';

const EARTH_RADIUS_METERS = 6371000;

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function pointToSegmentDistanceMeters(
  point: { lat: number; lng: number },
  start: [number, number],
  end: [number, number],
) {
  const px = point.lng;
  const py = point.lat;
  const x1 = start[0];
  const y1 = start[1];
  const x2 = end[0];
  const y2 = end[1];

  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return distanceMeters(point, { lat: y1, lng: x1 });
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const proj = { lng: x1 + t * dx, lat: y1 + t * dy };
  return distanceMeters(point, proj);
}

function pointToPolylineDistanceMeters(
  point: { lat: number; lng: number },
  coordinates: [number, number][],
) {
  if (coordinates.length < 2) return Number.POSITIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const dist = pointToSegmentDistanceMeters(point, coordinates[index], coordinates[index + 1]);
    if (dist < min) min = dist;
  }
  return min;
}

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function shortestAngleDiff(from: number, to: number) {
  const diff = normalizeAngle(to) - normalizeAngle(from);
  if (diff > 180) return diff - 360;
  if (diff < -180) return diff + 360;
  return diff;
}

export default function ActiveNavigationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef<MapboxMapHandle>(null);
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [orientationPermission, setOrientationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const orientationListenerActive = useRef(false);
  const lastBearing = useRef<number>(0);
  const orientationHandlerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);
  const offRouteCountRef = useRef(0);
  const lastRerouteAtRef = useRef(0);
  const stepIndexRef = useRef(0);
  const [isRerouting, setIsRerouting] = useState(false);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteData | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [liveDistanceToTurn, setLiveDistanceToTurn] = useState(0);
  const [liveEtaSeconds, setLiveEtaSeconds] = useState(0);
  
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
    updateDistance,
    updateETA,
    updateCurrentStep,
  } = useNavigation();
  
  const { userDoc } = useUserDoc();
  
  const jobId = location.state?.jobId;

  useEffect(() => {
    if (!currentRoute) return;
    setActiveRoute(currentRoute);
    setStepIndex(0);
    stepIndexRef.current = 0;
    setLiveDistanceToTurn(distanceToNextTurn || 0);
    setLiveEtaSeconds(estimatedTimeRemaining || currentRoute.duration || 0);
  }, [currentRoute, distanceToNextTurn, estimatedTimeRemaining]);

  useEffect(() => {
    if (!liveLocation && userDoc?.courierProfile?.currentLocation) {
      setLiveLocation(userDoc.courierProfile.currentLocation);
    }
  }, [liveLocation, userDoc?.courierProfile?.currentLocation]);

  // Generate route segments from current route
  const routeSegments: RouteSegment[] = useMemo(() => {
    if (!activeRoute) {
      console.log('🗺️ No current route');
      return [];
    }

    // Use the top-level geometry which has all coordinates
    const coordinates = activeRoute.geometry?.coordinates || [];

    console.log('🗺️ Navigation route segments:', {
      hasRoute: !!activeRoute,
      hasGeometry: !!activeRoute.geometry,
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
  }, [activeRoute]);

  const allSteps = useMemo(() => {
    if (!activeRoute) return [];
    return activeRoute.legs.flatMap((leg) => leg.steps);
  }, [activeRoute]);

  const displayStep = allSteps[stepIndex] || currentStep;

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
    if (cameraMode !== 'follow' || !mapRef.current || !liveLocation) return;
    const map = mapRef.current.getMap();
    if (!map) return;
    applyFollowCamera(map, liveLocation);
  }, [cameraMode, liveLocation]);

  // Follow mode: update bearing only
  useEffect(() => {
    if (cameraMode !== 'follow' || !mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;
    const diff = shortestAngleDiff(lastBearing.current, deviceHeading);
    if (Math.abs(diff) < 1.5) return;
    const nextBearing = normalizeAngle(lastBearing.current + diff * 0.2);
    lastBearing.current = nextBearing;
    map.easeTo({
      bearing: nextBearing,
      duration: 180,
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

    orientationHandlerRef.current = handleOrientation;

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
      if (orientationListenerActive.current && orientationHandlerRef.current) {
        window.removeEventListener('deviceorientation', orientationHandlerRef.current, true);
        orientationListenerActive.current = false;
        orientationHandlerRef.current = null;
      }
    };
  }, [orientationPermission]);

  useEffect(() => {
    if (!isNavigating || !activeRoute) return;
    if (!navigator?.geolocation?.watchPosition) return;

    const runReroute = async (locationPoint: { lat: number; lng: number }) => {
      if (!currentJob?.dropoff) return;
      const now = Date.now();
      if (isRerouting || now - lastRerouteAtRef.current < 12000) return;

      setIsRerouting(true);
      try {
        const directions = await fetchDirections(
          [
            [locationPoint.lng, locationPoint.lat],
            [currentJob.dropoff.lng, currentJob.dropoff.lat],
          ],
          {
            profile: 'driving-traffic',
            geometries: 'geojson',
            steps: true,
            overview: 'full',
            bannerInstructions: true,
            voiceInstructions: false,
          },
        );

        const nextRoute = directions.routes?.[0];
        if (nextRoute) {
          setActiveRoute(nextRoute);
          setStepIndex(0);
          stepIndexRef.current = 0;
          setLiveDistanceToTurn(nextRoute.legs?.[0]?.steps?.[0]?.distance || 0);
          setLiveEtaSeconds(nextRoute.duration || 0);
          updateDistance(nextRoute.legs?.[0]?.steps?.[0]?.distance || 0);
          updateETA(nextRoute.duration || 0);
          updateCurrentStep(0);
          lastRerouteAtRef.current = now;
          offRouteCountRef.current = 0;
        }
      } catch (error) {
        console.error('Failed to reroute', error);
      } finally {
        setIsRerouting(false);
      }
    };

    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLiveLocation(point);

        const steps = activeRoute.legs.flatMap((leg) => leg.steps);
        const currentIdx = stepIndexRef.current;
        const current = steps[currentIdx] || null;

        if (current?.maneuver?.location) {
          const maneuver = {
            lng: current.maneuver.location[0],
            lat: current.maneuver.location[1],
          };
          const meters = distanceMeters(point, maneuver);
          setLiveDistanceToTurn(meters);
          updateDistance(meters);

          const remainingDuration = steps
            .slice(currentIdx)
            .reduce((sum, step) => sum + (step.duration || 0), 0);
          setLiveEtaSeconds(remainingDuration);
          updateETA(remainingDuration);

          if (meters < 22 && currentIdx + 1 < steps.length) {
            const nextIndex = currentIdx + 1;
            setStepIndex(nextIndex);
            stepIndexRef.current = nextIndex;
            updateCurrentStep(nextIndex);
          }
        }

        const routeCoords = activeRoute.geometry?.coordinates || [];
        const offRouteDistance = pointToPolylineDistanceMeters(point, routeCoords);
        if (offRouteDistance > 85) {
          offRouteCountRef.current += 1;
        } else {
          offRouteCountRef.current = 0;
        }

        if (offRouteCountRef.current >= 3) {
          void runReroute(point);
        }
      },
      (error) => {
        console.error('Navigation watchPosition error', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      },
    );

    return () => {
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
    };
  }, [
    isNavigating,
    activeRoute,
    currentJob?.dropoff?.lat,
    currentJob?.dropoff?.lng,
    isRerouting,
    updateCurrentStep,
    updateDistance,
    updateETA,
  ]);

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

  const totalDistance = activeRoute?.distance || 0;

  console.log('🎨 Rendering navigation page with:', {
    hasJob: !!currentJob,
    hasRoute: !!activeRoute,
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
            currentStep={displayStep}
            distanceToTurn={liveDistanceToTurn || distanceToNextTurn}
            timeRemaining={liveEtaSeconds || estimatedTimeRemaining}
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
          courierLocation={(liveLocation || userDoc?.courierProfile?.currentLocation) as any || null}
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
          {isRerouting ? 'Rerouting…' : 'Navigating'}
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
