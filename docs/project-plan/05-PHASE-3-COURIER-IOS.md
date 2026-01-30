# Phase 3: Courier iOS Native App

**Duration:** 7-10 days  
**Status:** Planning  
**Priority:** High

---

## 📋 Overview

Build a native iOS courier app using React Native with a revolutionary **map-first design principle**. The entire app is a full-screen map with all UI elements floating over it - no page transitions, no bottom sheets, no navigation away from the map.

**Core Philosophy:** The courier should never lose sight of the map. Every interaction happens on or over the map surface.

---

## 🎯 Design Principle: Map-First

### Traditional Courier App (What We're NOT Building)
```
❌ Bottom tabs navigation
❌ Separate pages for jobs, earnings, profile
❌ Bottom sheets that hide the map
❌ Full-screen job details
❌ Multiple screens to accept a job
```

### GoSenderr Map-First (What We ARE Building)
```
✅ Full-screen map always visible
✅ Floating UI cards over map
✅ All actions happen on map
✅ Job markers directly on map
✅ One tap to accept job
✅ Minimal, distraction-free UI
```

---

## 🗺️ Visual Layout

```
┌─────────────────────────────────┐
│ [Toggle] 🟢 Online  [@Profile]  │ ← Floating top bar
│                                  │
│          📍                      │
│                                  │
│              🗺️                  │ ← Full-screen Mapbox
│                                  │
│    📦 (job markers)              │
│                                  │
│  ┌──────────────────────────┐  │
│  │ 💼 New Job Available     │  │ ← Floating job card
│  │                          │  │
│  │ Pickup: 123 Main St      │  │
│  │ Deliver: 456 Oak Ave     │  │
│  │ Pay: $12.50              │  │
│  │                          │  │
│  │ [Accept] [Skip]          │  │
│  └──────────────────────────┘  │
│                                  │
│  [$45.50 Today] 💰              │ ← Floating earnings badge
└─────────────────────────────────┘
```

---

## 🏗️ Technical Stack

### Core Technologies
- **React Native** 0.73+
- **TypeScript** 5.3+
- **Mapbox GL Native SDK** 11.0+
- **Firebase SDK** (Native modules)
- **React Navigation** (for modals only)
- **Redux Toolkit** (state management)

### Key Native Modules
```json
{
  "@react-native-firebase/app": "^19.0.0",
  "@react-native-firebase/auth": "^19.0.0",
  "@react-native-firebase/firestore": "^19.0.0",
  "@react-native-firebase/messaging": "^19.0.0",
  "@react-native-firebase/storage": "^19.0.0",
  "@rnmapbox/maps": "^10.1.0",
  "@react-navigation/native": "^6.1.0",
  "@react-navigation/stack": "^6.3.0",
  "@reduxjs/toolkit": "^2.0.0",
  "react-native-location": "^3.2.0",
  "react-native-vision-camera": "^3.8.0",
  "react-native-permissions": "^4.0.0",
  "react-native-geolocation-service": "^5.3.0"
}
```

---

## 📁 Project Structure

```
apps/courier-ios-native/
├── ios/                        # Native iOS project (Xcode)
│   ├── CourierApp/
│   │   ├── Info.plist
│   │   ├── AppDelegate.mm
│   │   └── LaunchScreen.storyboard
│   ├── CourierApp.xcodeproj
│   └── Podfile
├── android/                    # (Future: Android support)
├── src/
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapContainer.tsx          # Main map component
│   │   │   ├── JobMarker.tsx             # Custom job marker
│   │   │   ├── CourierMarker.tsx         # Courier location marker
│   │   │   ├── RouteOverlay.tsx          # Navigation route
│   │   │   └── MapControls.tsx           # Zoom, center buttons
│   │   ├── floating/
│   │   │   ├── TopBar.tsx                # Status toggle, profile
│   │   │   ├── JobCard.tsx               # Job details card
│   │   │   ├── ActiveJobCard.tsx         # Current delivery info
│   │   │   ├── EarningsBadge.tsx         # Today's earnings
│   │   │   └── NotificationBanner.tsx    # Toast-style alerts
│   │   ├── modals/
│   │   │   ├── JobDetailsModal.tsx       # Full job details
│   │   │   ├── PhotoCaptureModal.tsx     # Camera for proof
│   │   │   ├── ProfileModal.tsx          # Profile settings
│   │   │   └── EarningsModal.tsx         # Earnings breakdown
│   │   └── shared/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── Badge.tsx
│   ├── screens/
│   │   ├── MapScreen.tsx                 # Main screen (map + overlays)
│   │   ├── OnboardingScreen.tsx          # First-time setup
│   │   └── LoginScreen.tsx               # Phone auth
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   └── linking.ts
│   ├── services/
│   │   ├── firebase/
│   │   │   ├── auth.service.ts
│   │   │   ├── firestore.service.ts
│   │   │   ├── storage.service.ts
│   │   │   └── messaging.service.ts
│   │   ├── location.service.ts
│   │   ├── navigation.service.ts
│   │   └── jobs.service.ts
│   ├── store/
│   │   ├── index.ts
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── jobsSlice.ts
│   │   │   ├── locationSlice.ts
│   │   │   └── earningsSlice.ts
│   │   └── middleware/
│   │       └── locationMiddleware.ts
│   ├── hooks/
│   │   ├── useLocation.ts
│   │   ├── useJobs.ts
│   │   ├── useNavigation.ts
│   │   └── useCamera.ts
│   ├── types/
│   │   ├── job.types.ts
│   │   ├── location.types.ts
│   │   └── navigation.types.ts
│   ├── utils/
│   │   ├── distance.ts
│   │   ├── formatters.ts
│   │   └── permissions.ts
│   ├── constants/
│   │   ├── colors.ts
│   │   └── mapStyle.ts
│   └── App.tsx
├── package.json
├── tsconfig.json
├── metro.config.js
├── babel.config.js
└── app.json
```

---

## 🗺️ Map Implementation

### MapContainer.tsx (Core Component)

```typescript
import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { JobMarker } from './JobMarker';
import { CourierMarker } from './CourierMarker';
import { RouteOverlay } from './RouteOverlay';

MapboxGL.setAccessToken(process.env.MAPBOX_ACCESS_TOKEN);

export const MapContainer: React.FC = () => {
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  
  const { location } = useSelector((state: RootState) => state.location);
  const { availableJobs, activeJob } = useSelector((state: RootState) => state.jobs);
  
  const [followUser, setFollowUser] = useState(true);
  
  // Center map on courier location
  useEffect(() => {
    if (location && followUser) {
      cameraRef.current?.setCamera({
        centerCoordinate: [location.longitude, location.latitude],
        zoomLevel: 15,
        animationDuration: 1000
      });
    }
  }, [location, followUser]);
  
  // Fit map to show route when job is active
  useEffect(() => {
    if (activeJob && activeJob.route) {
      const coordinates = activeJob.route.coordinates;
      cameraRef.current?.fitBounds(
        [coordinates[0], coordinates[coordinates.length - 1]],
        [50, 50, 50, 50], // padding
        1000 // animation duration
      );
    }
  }, [activeJob]);
  
  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Street}
        rotateEnabled={false}
        pitchEnabled={false}
        onTouchStart={() => setFollowUser(false)}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          followUserLocation={followUser}
          followZoomLevel={15}
        />
        
        {/* Courier location */}
        {location && (
          <CourierMarker 
            coordinate={[location.longitude, location.latitude]}
            heading={location.heading}
          />
        )}
        
        {/* Available job markers */}
        {availableJobs.map(job => (
          <JobMarker
            key={job.id}
            job={job}
            coordinate={[job.pickupLocation.longitude, job.pickupLocation.latitude]}
          />
        ))}
        
        {/* Active job route */}
        {activeJob && <RouteOverlay route={activeJob.route} />}
      </MapboxGL.MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  map: {
    flex: 1
  }
});
```

---

### Custom Markers

```typescript
// JobMarker.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';

interface JobMarkerProps {
  job: Job;
  coordinate: [number, number];
}

export const JobMarker: React.FC<JobMarkerProps> = ({ job, coordinate }) => {
  return (
    <MapboxGL.PointAnnotation
      id={`job-${job.id}`}
      coordinate={coordinate}
    >
      <View style={styles.marker}>
        <View style={styles.markerInner}>
          <Text style={styles.markerText}>📦</Text>
        </View>
        <View style={styles.markerPriceTag}>
          <Text style={styles.priceText}>${(job.courierPay / 100).toFixed(2)}</Text>
        </View>
      </View>
    </MapboxGL.PointAnnotation>
  );
};

const styles = StyleSheet.create({
  marker: {
    alignItems: 'center'
  },
  markerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  markerText: {
    fontSize: 20
  },
  markerPriceTag: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  priceText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold'
  }
});
```

---

## 🎴 Floating UI Components

### JobCard.tsx (Floating over map)

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Job } from '@/types/job.types';
import { formatDistance } from '@/utils/distance';
import { useDispatch } from 'react-redux';
import { acceptJob, skipJob } from '@/store/slices/jobsSlice';

interface JobCardProps {
  job: Job;
  distanceToPickup: number; // meters
}

export const JobCard: React.FC<JobCardProps> = ({ job, distanceToPickup }) => {
  const dispatch = useDispatch();
  const [slideAnim] = React.useState(new Animated.Value(300));
  
  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8
    }).start();
  }, []);
  
  const handleAccept = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      dispatch(acceptJob(job.id));
    });
  };
  
  const handleSkip = () => {
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      dispatch(skipJob(job.id));
    });
  };
  
  return (
    <Animated.View 
      style={[
        styles.card,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>💼 New Job Available</Text>
        <Text style={styles.distance}>{formatDistance(distanceToPickup)} away</Text>
      </View>
      
      <View style={styles.details}>
        <View style={styles.row}>
          <Text style={styles.label}>📍 Pickup</Text>
          <Text style={styles.value}>{job.pickupAddress.street}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>📍 Deliver</Text>
          <Text style={styles.value}>{job.dropoffAddress.street}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>💰 Pay</Text>
          <Text style={styles.payValue}>${(job.courierPay / 100).toFixed(2)}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>📏 Distance</Text>
          <Text style={styles.value}>{formatDistance(job.distanceMeters)}</Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.acceptButton}
          onPress={handleAccept}
        >
          <Text style={styles.acceptText}>Accept Job</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  distance: {
    fontSize: 14,
    color: '#6b7280'
  },
  details: {
    marginBottom: 20
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1
  },
  value: {
    fontSize: 14,
    color: '#1f2937',
    flex: 2,
    textAlign: 'right'
  },
  payValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#16a34a',
    flex: 2,
    textAlign: 'right'
  },
  actions: {
    flexDirection: 'row',
    gap: 12
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center'
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280'
  },
  acceptButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center'
  },
  acceptText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff'
  }
});
```

---

### TopBar.tsx (Status Toggle + Profile)

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { toggleOnlineStatus } from '@/store/slices/authSlice';

export const TopBar: React.FC<{ onProfilePress: () => void }> = ({ onProfilePress }) => {
  const { isOnline, user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  
  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <Switch
          value={isOnline}
          onValueChange={() => dispatch(toggleOnlineStatus())}
          trackColor={{ false: '#d1d5db', true: '#10b981' }}
          thumbColor="#ffffff"
        />
        <View style={[styles.statusDot, isOnline && styles.statusDotOnline]} />
        <Text style={styles.statusText}>
          {isOnline ? 'Online' : 'Offline'}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.profileButton}
        onPress={onProfilePress}
      >
        <Text style={styles.profileText}>
          {user?.displayName?.charAt(0) || '👤'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginLeft: 8,
    marginRight: 8
  },
  statusDotOnline: {
    backgroundColor: '#10b981'
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937'
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  profileText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff'
  }
});
```

---

## 📍 Location Tracking

### location.service.ts

```typescript
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';
import { doc, updateDoc, GeoPoint, Timestamp } from 'firebase/firestore';
import { db } from './firebase/firestore.service';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

class LocationService {
  private watchId: number | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private lastLocation: Location | null = null;
  private courierId: string | null = null;
  
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const status = await Geolocation.requestAuthorization('always');
      return status === 'granted';
    }
    
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    
    return false;
  }
  
  startTracking(courierId: string, callback: (location: Location) => void): void {
    this.courierId = courierId;
    
    // Start watching position
    this.watchId = Geolocation.watchPosition(
      (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          timestamp: position.timestamp
        };
        
        this.lastLocation = location;
        callback(location);
      },
      (error) => {
        console.error('Location error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 5000, // Update every 5 seconds
        fastestInterval: 2000,
        showLocationDialog: true
      }
    );
    
    // Update Firestore every 30 seconds
    this.updateInterval = setInterval(() => {
      if (this.lastLocation && this.courierId) {
        this.updateFirestore(this.courierId, this.lastLocation);
      }
    }, 30000);
  }
  
  stopTracking(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  private async updateFirestore(courierId: string, location: Location): Promise<void> {
    try {
      const courierRef = doc(db, 'users', courierId);
      await updateDoc(courierRef, {
        'courierProfile.currentLocation': new GeoPoint(
          location.latitude,
          location.longitude
        ),
        'courierProfile.lastLocationUpdate': Timestamp.now(),
        'courierProfile.heading': location.heading || null,
        'courierProfile.speed': location.speed || null
      });
    } catch (error) {
      console.error('Failed to update location in Firestore:', error);
    }
  }
  
  getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp
          });
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000
        }
      );
    });
  }
}

export const locationService = new LocationService();
```

---

## 🧭 Turn-by-Turn Navigation

### navigation.service.ts

```typescript
import MapboxDirections from '@mapbox/mapbox-sdk/services/directions';
import { Feature, LineString } from 'geojson';

const directionsClient = MapboxDirections({ 
  accessToken: process.env.MAPBOX_ACCESS_TOKEN! 
});

export interface NavigationRoute {
  distance: number; // meters
  duration: number; // seconds
  coordinates: [number, number][];
  steps: RouteStep[];
}

export interface RouteStep {
  distance: number;
  duration: number;
  instruction: string;
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number];
  };
}

class NavigationService {
  async getRoute(
    origin: [number, number],
    destination: [number, number]
  ): Promise<NavigationRoute> {
    try {
      const response = await directionsClient.getDirections({
        profile: 'driving',
        waypoints: [
          { coordinates: origin },
          { coordinates: destination }
        ],
        geometries: 'geojson',
        steps: true,
        bannerInstructions: true,
        voiceInstructions: true
      }).send();
      
      const route = response.body.routes[0];
      const leg = route.legs[0];
      
      return {
        distance: route.distance,
        duration: route.duration,
        coordinates: (route.geometry as LineString).coordinates as [number, number][],
        steps: leg.steps.map(step => ({
          distance: step.distance,
          duration: step.duration,
          instruction: step.maneuver.instruction,
          maneuver: {
            type: step.maneuver.type,
            modifier: step.maneuver.modifier,
            location: step.maneuver.location as [number, number]
          }
        }))
      };
    } catch (error) {
      console.error('Navigation error:', error);
      throw error;
    }
  }
  
  calculateProgress(
    currentLocation: [number, number],
    route: NavigationRoute
  ): number {
    // Find closest point on route
    let minDistance = Infinity;
    let closestIndex = 0;
    
    route.coordinates.forEach((coord, index) => {
      const distance = this.getDistance(currentLocation, coord);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    // Calculate progress percentage
    const progress = closestIndex / route.coordinates.length;
    return Math.min(Math.max(progress, 0), 1);
  }
  
  private getDistance(
    coord1: [number, number],
    coord2: [number, number]
  ): number {
    // Haversine formula
    const R = 6371e3; // Earth radius in meters
    const φ1 = coord1[1] * Math.PI / 180;
    const φ2 = coord2[1] * Math.PI / 180;
    const Δφ = (coord2[1] - coord1[1]) * Math.PI / 180;
    const Δλ = (coord2[0] - coord1[0]) * Math.PI / 180;
    
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }
}

export const navigationService = new NavigationService();
```

---

## 📸 Camera Integration

### PhotoCaptureModal.tsx

```typescript
import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal } from 'react-native';
import { Camera, useCameraDevices, PhotoFile } from 'react-native-vision-camera';
import { uploadJobPhoto } from '@/services/firebase/storage.service';

interface PhotoCaptureModalProps {
  visible: boolean;
  jobId: string;
  photoType: 'pickup' | 'dropoff';
  onComplete: (photoURL: string) => void;
  onClose: () => void;
}

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  visible,
  jobId,
  photoType,
  onComplete,
  onClose
}) => {
  const camera = useRef<Camera>(null);
  const devices = useCameraDevices();
  const device = devices.back;
  
  const [photo, setPhoto] = useState<PhotoFile | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const takePhoto = async () => {
    if (camera.current) {
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'balanced',
        flash: 'auto'
      });
      setPhoto(photo);
    }
  };
  
  const uploadPhoto = async () => {
    if (!photo) return;
    
    setUploading(true);
    
    try {
      const photoURL = await uploadJobPhoto(jobId, photoType, photo.path);
      onComplete(photoURL);
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  const retake = () => {
    setPhoto(null);
  };
  
  if (!device) {
    return null;
  }
  
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {!photo ? (
          <>
            <Camera
              ref={camera}
              style={styles.camera}
              device={device}
              isActive={visible}
              photo={true}
            />
            
            <View style={styles.controls}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              
              <View style={styles.placeholder} />
            </View>
            
            <View style={styles.instructions}>
              <Text style={styles.instructionText}>
                📦 Take a photo of the {photoType === 'pickup' ? 'package' : 'delivered package'}
              </Text>
            </View>
          </>
        ) : (
          <>
            <Image source={{ uri: `file://${photo.path}` }} style={styles.preview} />
            
            <View style={styles.reviewControls}>
              <TouchableOpacity style={styles.retakeButton} onPress={retake}>
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.uploadButton} 
                onPress={uploadPhoto}
                disabled={uploading}
              >
                <Text style={styles.uploadText}>
                  {uploading ? 'Uploading...' : 'Use Photo'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000'
  },
  camera: {
    flex: 1
  },
  preview: {
    flex: 1
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  closeButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeText: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: 'bold'
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#e5e7eb'
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ffffff'
  },
  placeholder: {
    width: 50
  },
  instructions: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 12
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center'
  },
  reviewControls: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12
  },
  retakeButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#374151',
    alignItems: 'center'
  },
  retakeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  uploadButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center'
  },
  uploadText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
```

---

## 🔄 Job Acceptance Flow

### Atomic Job Claiming

```typescript
// services/jobs.service.ts
import { 
  doc, 
  runTransaction, 
  Timestamp, 
  collection 
} from 'firebase/firestore';
import { db } from './firebase/firestore.service';

export async function claimJob(jobId: string, courierId: string): Promise<boolean> {
  const jobRef = doc(db, 'jobs', jobId);
  
  try {
    const result = await runTransaction(db, async (transaction) => {
      const jobDoc = await transaction.get(jobRef);
      
      if (!jobDoc.exists()) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      
      // Check if already claimed
      if (jobData.status !== 'awaiting_courier' || jobData.courierId) {
        return false; // Already claimed by someone else
      }
      
      // Claim the job atomically
      transaction.update(jobRef, {
        courierId,
        status: 'claimed',
        claimedAt: Timestamp.now()
      });
      
      // Update courier's active job
      const courierRef = doc(db, 'users', courierId);
      transaction.update(courierRef, {
        'courierProfile.activeJobId': jobId,
        'courierProfile.status': 'busy'
      });
      
      return true; // Successfully claimed
    });
    
    return result;
  } catch (error) {
    console.error('Job claim error:', error);
    return false;
  }
}
```

---

## 📝 Implementation Steps

### Day 1-2: Project Setup & Map Shell

**Day 1 Morning:**
1. Initialize React Native project: `npx react-native init CourierApp --template react-native-template-typescript`
2. Install core dependencies (Mapbox, Firebase, Navigation)
3. Configure iOS project (Info.plist permissions)
4. Set up Firebase iOS SDK

**Day 1 Afternoon:**
5. Configure Mapbox (API token, native setup)
6. Create basic map container component
7. Test map rendering on simulator
8. Add courier location marker

**Day 2 Morning:**
9. Implement location service
10. Request location permissions
11. Start location tracking
12. Update courier marker in real-time

**Day 2 Afternoon:**
13. Set up Redux store
14. Create slices (auth, jobs, location, earnings)
15. Connect map to Redux state
16. Test state management

**Deliverable:** Full-screen map with courier location tracking

---

### Day 3-4: Floating UI & Job Display

**Day 3 Morning:**
1. Build TopBar component (online toggle, profile button)
2. Create JobCard component
3. Add job markers to map
4. Fetch available jobs from Firestore

**Day 3 Afternoon:**
5. Implement job card animation (slide up)
6. Add Accept/Skip buttons
7. Build earnings badge
8. Create notification banner

**Day 4 Morning:**
9. Build ActiveJobCard (for current delivery)
10. Show pickup and dropoff pins
11. Display route on map
12. Add navigation instructions

**Day 4 Afternoon:**
13. Build modals (JobDetails, Profile, Earnings)
14. Implement modal navigation
15. Polish UI animations
16. Test all floating components

**Deliverable:** Complete floating UI system over map

---

### Day 5-6: Job Acceptance & Navigation

**Day 5 Morning:**
1. Implement atomic job claiming
2. Build job acceptance flow
3. Handle claim conflicts (race conditions)
4. Update job status in Firestore

**Day 5 Afternoon:**
5. Integrate Mapbox Directions API
6. Fetch navigation route
7. Display route on map
8. Calculate ETA

**Day 6 Morning:**
9. Implement turn-by-turn instructions
10. Update instructions based on location
11. Add voice announcements (optional)
12. Build navigation progress bar

**Day 6 Afternoon:**
13. Test complete job flow (claim → navigate → deliver)
14. Handle job cancellation
15. Implement job timeout
16. Add error handling

**Deliverable:** Full job acceptance and navigation working

---

### Day 7-8: Camera & Delivery Completion

**Day 7 Morning:**
1. Install react-native-vision-camera
2. Request camera permissions
3. Build PhotoCaptureModal
4. Test camera on device (required - doesn't work on simulator)

**Day 7 Afternoon:**
5. Implement photo upload to Firebase Storage
6. Create jobPhotos Firestore collection
7. Associate photos with jobs
8. Build photo review screen

**Day 8 Morning:**
9. Implement pickup flow (photo + status update)
10. Implement dropoff flow (photo + status update)
11. Build delivery completion screen
12. Calculate and display earnings

**Day 8 Afternoon:**
13. Test complete delivery flow
14. Handle photo upload failures (retry)
15. Add loading states
16. Polish UI feedback

**Deliverable:** Complete delivery flow with photo capture

---

### Day 9-10: Earnings, Testing & Polish

**Day 9 Morning:**
1. Build EarningsModal (daily, weekly breakdown)
2. Fetch earnings from Firestore
3. Display payment history
4. Add payout information

**Day 9 Afternoon:**
5. Build ProfileModal (settings, logout)
6. Implement app settings
7. Add support/help section
8. Build onboarding flow

**Day 10 Morning:**
9. Comprehensive testing on physical device
10. Test location tracking accuracy
11. Test job claiming race conditions
12. Test camera and upload

**Day 10 Afternoon:**
13. Performance optimization (60fps map)
14. Reduce bundle size
15. Fix bugs and UI polish
16. Prepare App Store submission

**Deliverable:** Production-ready iOS app

---

## ✅ Testing Checklist

### Functional Testing
- [ ] Map renders at 60fps
- [ ] Courier location updates in real-time
- [ ] Job markers appear on map
- [ ] Job card slides up when available
- [ ] Accept job claims atomically
- [ ] Skip job removes from queue
- [ ] Navigation route displays correctly
- [ ] Turn-by-turn instructions update
- [ ] Camera captures photos
- [ ] Photos upload successfully
- [ ] Pickup photo updates job status
- [ ] Dropoff photo completes delivery
- [ ] Earnings update correctly
- [ ] Online/offline toggle works
- [ ] Profile modal displays settings

### Performance Testing
- [ ] App launch < 2 seconds
- [ ] Map rendering 60fps on iPhone 12+
- [ ] Location updates < 100ms latency
- [ ] Memory usage < 200MB
- [ ] Battery drain < 10% per hour
- [ ] Photo upload < 5 seconds

### Edge Cases
- [ ] Job claimed by another courier
- [ ] Lost internet connection during delivery
- [ ] Camera permission denied
- [ ] Location permission denied
- [ ] App backgrounded during delivery
- [ ] Battery saver mode enabled

---

## 🚨 Common Issues & Solutions

### Issue: Map not rendering
**Solution:** Ensure Mapbox token is set in environment and native iOS setup is complete
```bash
cd ios && pod install && cd ..
```

---

### Issue: Location not updating
**Solution:** Check Info.plist has all required location permissions
```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>We need your location to show nearby jobs and navigate to deliveries.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to show nearby jobs.</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>We track your location in the background during active deliveries.</string>
```

---

### Issue: Camera not working in simulator
**Solution:** Camera only works on physical devices. Test on real iPhone.

---

### Issue: Job claimed by multiple couriers
**Solution:** Use Firestore transactions for atomic claiming (already implemented above)

---

## 📈 Success Criteria

- [ ] Map renders at 60fps on iPhone 12+
- [ ] All UI elements float over map
- [ ] No page transitions (except modals)
- [ ] Couriers can accept jobs with one tap
- [ ] Turn-by-turn navigation works
- [ ] Photo capture implemented
- [ ] Earnings tracking accurate
- [ ] Location tracking within 50m accuracy
- [ ] App uses < 200MB RAM
- [ ] Battery drain < 10% per hour
- [ ] iOS app submitted to App Store

---

## 🔄 Phase 3 Exit Criteria

**Ready for production when:**
1. ✅ Map-first UI complete (no page transitions)
2. ✅ Job acceptance working atomically
3. ✅ Navigation with Mapbox functional
4. ✅ Camera integration complete
5. ✅ Delivery completion flow working
6. ✅ Earnings tracking accurate
7. ✅ Performance: 60fps on iPhone 12+
8. ✅ Battery drain < 10% per hour
9. ✅ iOS app submitted to App Store
10. ✅ At least 5 couriers tested successfully

---

*This phase delivers a revolutionary map-first courier experience optimized for one-handed operation while driving.*
