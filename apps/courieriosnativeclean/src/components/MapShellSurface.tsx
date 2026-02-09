import React, {useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import MapView, {Marker, type Region} from 'react-native-maps';

import {validateMapsConfig} from '../config/maps';
import {useServiceRegistry} from '../services/serviceRegistry';
import type {LocationSnapshot} from '../services/ports/locationPort';
import type {Job} from '../types/jobs';

type MapShellSurfaceProps = {
  activeJob: Job | null;
  courierLocation: LocationSnapshot | null;
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
        color: '#1453ff',
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

  useEffect(() => {
    if (
      !mapRoutingEnabled ||
      !mapReady ||
      !mapRef.current ||
      points.length < 2
    ) {
      return;
    }

    mapRef.current.fitToCoordinates(
      points.map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
      })),
      {
        animated: true,
        edgePadding: {
          top: 96,
          right: 64,
          bottom: 240,
          left: 64,
        },
      },
    );
  }, [mapReady, mapRoutingEnabled, points]);

  useEffect(() => {
    if (
      !mapRoutingEnabled ||
      !mapReady ||
      !mapRef.current ||
      points.length !== 1
    ) {
      return;
    }

    const point = points[0];
    mapRef.current.animateToRegion(
      {
        latitude: point.latitude,
        longitude: point.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      350,
    );
  }, [mapReady, mapRoutingEnabled, points]);

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
    <View style={styles.surface}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={buildRegion(points[0])}
        rotateEnabled
        pitchEnabled
        toolbarEnabled={false}
        onMapReady={() => setMapReady(true)}>
        {points.map(point => (
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
      </MapView>

      <View pointerEvents="none" style={styles.mapStatus}>
        <Text style={styles.mapStatusText}>
          {mapsValidation.status === 'ok' ? 'Map ready' : 'Map config warning'}{' '}
          · {points.length} marker
          {points.length === 1 ? '' : 's'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  mapStatus: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mapStatusText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledSurface: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 28,
  },
  disabledTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabledSubtitle: {
    color: '#cbd5e1',
    textAlign: 'center',
  },
});
