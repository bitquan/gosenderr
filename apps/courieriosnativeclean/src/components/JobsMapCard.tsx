import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import MapView, {Marker, type Region} from 'react-native-maps';

import {validateMapsConfig} from '../config/maps';
import type {LocationSnapshot} from '../services/ports/locationPort';
import type {Job} from '../types/jobs';

type JobsMapCardProps = {
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

export const JobsMapCard = ({activeJob, courierLocation}: JobsMapCardProps): React.JSX.Element => {
  const mapRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapsValidation = validateMapsConfig();

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
    if (!mapReady || !mapRef.current || points.length < 2) {
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
          top: 56,
          right: 56,
          bottom: 56,
          left: 56,
        },
      },
    );
  }, [mapReady, points]);


  useEffect(() => {
    if (!mapReady || !mapRef.current || points.length !== 1) {
      return;
    }

    const point = points[0];
    mapRef.current.animateToRegion(
      {
        latitude: point.latitude,
        longitude: point.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      350,
    );
  }, [mapReady, points]);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Map Validation</Text>
      <Text style={styles.message}>
        {activeJob ? 'Active job map preview is live.' : 'No active job yet. Showing courier position when available.'}
      </Text>
      <Text style={[styles.config, mapsValidation.status === 'warning' ? styles.configWarning : null]}>
        {mapsValidation.message}
      </Text>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={buildRegion(points[0])}
        rotateEnabled
        pitchEnabled
        toolbarEnabled={false}
        onMapReady={() => setMapReady(true)}
      >
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

      {points.length === 0 ? <Text style={styles.helper}>Start tracking to place your courier marker.</Text> : null}
      {Platform.OS === 'ios' ? (
        <Text style={styles.helper}>iOS map interactions are enabled: pinch, pan, and rotate.</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  message: {
    color: '#4b5563',
  },
  config: {
    color: '#0f766e',
    fontWeight: '600',
    fontSize: 12,
  },
  configWarning: {
    color: '#b45309',
  },
  map: {
    width: '100%',
    height: 220,
    borderRadius: 10,
  },
  helper: {
    color: '#6b7280',
    fontSize: 12,
  },
});
