import React, {useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import MapView, {Marker, Polyline, type Region} from 'react-native-maps';

import {validateMapsConfig} from '../config/maps';
import {useServiceRegistry} from '../services/serviceRegistry';
import type {LocationSnapshot} from '../services/ports/locationPort';
import type {MapShellCameraMode, RouteCoordinate} from '../screens/viewModels/mapShellRouteView';
import {senderrTheme} from '../theme/senderrTheme';
import type {Job} from '../types/jobs';

type MapShellSurfaceProps = {
  activeJob: Job | null;
  courierLocation: LocationSnapshot | null;
  routeCoordinates: RouteCoordinate[];
  cameraMode: MapShellCameraMode;
  onCameraModeChange: (mode: MapShellCameraMode) => void;
  viewMode: 'full' | 'route_only';
};

type MapPoint = {
  id: string;
  title: string;
  color: string;
  latitude: number;
  longitude: number;
};

const FALLBACK_REGION: Region = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const buildRegion = (point: MapPoint | undefined): Region => {
  if (!point) {
    return FALLBACK_REGION;
  }

  return {
    latitude: point.latitude,
    longitude: point.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };
};

export const MapShellSurface = ({
  activeJob,
  courierLocation,
  routeCoordinates,
  cameraMode,
  onCameraModeChange,
  viewMode,
}: MapShellSurfaceProps): React.JSX.Element => {
  const {featureFlags} = useServiceRegistry();
  const {state: flagsState} = featureFlags.useFeatureFlags();
  const mapRoutingEnabled = flagsState.flags.mapRouting;
  const mapsValidation = validateMapsConfig();
  const mapRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const points = useMemo<MapPoint[]>(() => {
    const next: MapPoint[] = [];

    if (courierLocation) {
      next.push({
        id: 'courier',
        title: 'You',
        color: senderrTheme.colors.brandPrimary,
        latitude: courierLocation.latitude,
        longitude: courierLocation.longitude,
      });
    }

    if (activeJob?.pickupLocation) {
      next.push({
        id: 'pickup',
        title: 'Pickup',
        color: '#16a34a',
        latitude: activeJob.pickupLocation.latitude,
        longitude: activeJob.pickupLocation.longitude,
      });
    }

    if (activeJob?.dropoffLocation) {
      next.push({
        id: 'dropoff',
        title: 'Dropoff',
        color: '#dc2626',
        latitude: activeJob.dropoffLocation.latitude,
        longitude: activeJob.dropoffLocation.longitude,
      });
    }

    return next;
  }, [activeJob, courierLocation]);

  const markerCoordinates = useMemo(
    () =>
      points.map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
      })),
    [points],
  );
  const routeOnlyActive = viewMode === 'route_only' && routeCoordinates.length >= 2;
  const visiblePoints = useMemo(
    () => (routeOnlyActive ? points.filter(point => point.id !== 'courier') : points),
    [points, routeOnlyActive],
  );

  useEffect(() => {
    if (
      !mapRoutingEnabled ||
      !mapReady ||
      !mapRef.current ||
      cameraMode !== 'fit_route'
    ) {
      return;
    }

    const coordinates = routeCoordinates.length >= 2 ? routeCoordinates : markerCoordinates;
    if (coordinates.length >= 2) {
      mapRef.current.fitToCoordinates(coordinates, {
        animated: true,
        edgePadding: {
          top: 160,
          right: 72,
          bottom: 260,
          left: 72,
        },
      });
      return;
    }

    if (coordinates.length === 1) {
      const point = coordinates[0];
      mapRef.current.animateToRegion(
        {
          latitude: point.latitude,
          longitude: point.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        350,
      );
    }
  }, [
    cameraMode,
    mapReady,
    mapRoutingEnabled,
    markerCoordinates,
    routeCoordinates,
  ]);

  useEffect(() => {
    if (
      !mapRoutingEnabled ||
      !mapReady ||
      !mapRef.current ||
      cameraMode !== 'follow_courier' ||
      !courierLocation
    ) {
      return;
    }

    mapRef.current.animateCamera(
      {
        center: {
          latitude: courierLocation.latitude,
          longitude: courierLocation.longitude,
        },
        zoom: 15,
      },
      {duration: 300},
    );
  }, [cameraMode, courierLocation, mapReady, mapRoutingEnabled]);

  if (!mapRoutingEnabled) {
    return (
      <View style={styles.disabledSurface}>
        <Text style={styles.disabledTitle}>
          Map is disabled by feature flag
        </Text>
        <Text style={styles.disabledSubtitle}>
          Enable `mapRouting` to use MapShell navigation preview.
        </Text>
      </View>
    );
  }

  return (
    <View testID="map-surface" style={styles.surface}>
      <MapView
        ref={mapRef}
        // allow MapView to receive touch events even when not in `manual` so
        // an initial thumb drag both switches to manual and moves the map.
        pointerEvents={'auto'}
        style={StyleSheet.absoluteFill}
        initialRegion={buildRegion(points[0])}
        // Keep gestures enabled at all times so the user can always take control.
        // Camera mode effects still auto-position when in Follow/Fit.
        rotateEnabled={true}
        pitchEnabled={true}
        zoomEnabled={true}
        scrollEnabled={true}
        onTouchStart={() => {
          if (cameraMode !== 'manual') {
            onCameraModeChange('manual');
          }
        }}
        onPanDrag={() => {
          if (cameraMode !== 'manual') {
            onCameraModeChange('manual');
          }
        }}
        toolbarEnabled={false}
        onMapReady={() => setMapReady(true)}>
        {visiblePoints.map(point => (
          <Marker
            key={point.id}
            coordinate={{
              latitude: point.latitude,
              longitude: point.longitude,
            }}
            title={point.title}
            pinColor={point.color}
          />
        ))}
        {routeCoordinates.length >= 2 ? (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#2563eb"
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}
      </MapView>

      <View pointerEvents="none" style={styles.mapStatus}>
        <Text style={styles.mapStatusText}>
          {mapsValidation.status === 'ok' ? 'Map ready' : 'Map config warning'}{' '}
          · {visiblePoints.length} marker
          {visiblePoints.length === 1 ? '' : 's'}
          {routeOnlyActive ? ' · route only' : ''}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    backgroundColor: senderrTheme.colors.darkSurface,
  },
  mapStatus: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: senderrTheme.colors.darkSurfaceSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mapStatusText: {
    color: '#E8ECFF',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledSurface: {
    flex: 1,
    backgroundColor: senderrTheme.colors.darkSurface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 28,
  },
  disabledTitle: {
    color: '#F6F7FF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabledSubtitle: {
    color: '#CBD2EC',
    textAlign: 'center',
  },
});
