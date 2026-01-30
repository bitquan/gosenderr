/**
 * Mock GPS for local testing when browser geolocation is unavailable
 * Usage: In console, run: enableMockGPS() to simulate location tracking
 */

interface MockGPSConfig {
  startLat: number;
  startLng: number;
  speed: number; // meters per second
  heading: number; // degrees 0-360
}

const DEFAULT_CONFIG: MockGPSConfig = {
  startLat: 37.7749,
  startLng: -122.4194,
  speed: 5, // 5 m/s = 18 km/h
  heading: 45,
};

let mockWatchId = 1;
const mockWatches = new Map<number, NodeJS.Timer>();

export function enableMockGPS(config: Partial<MockGPSConfig> = {}) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  console.log('🎯 Mock GPS enabled with config:', fullConfig);
  
  // Override navigator.geolocation.watchPosition
  const originalWatchPosition = navigator.geolocation.watchPosition;
  let currentLat = fullConfig.startLat;
  let currentLng = fullConfig.startLng;
  let heading = fullConfig.heading;
  
  navigator.geolocation.watchPosition = function(
    successCallback,
    errorCallback,
    options
  ) {
    const watchId = mockWatchId++;
    
    // Simulate movement every 2 seconds
    const interval = setInterval(() => {
      // Move in the direction of heading
      const latChange = (fullConfig.speed / 111000) * Math.sin(heading * Math.PI / 180);
      const lngChange = (fullConfig.speed / 111000) * Math.cos(heading * Math.PI / 180);
      
      currentLat += latChange;
      currentLng += lngChange;
      
      // Simulate slight heading changes for realism
      heading = (heading + (Math.random() - 0.5) * 5) % 360;
      
      const mockPosition = {
        coords: {
          latitude: currentLat,
          longitude: currentLng,
          altitude: null,
          accuracy: 5,
          altitudeAccuracy: null,
          heading: heading,
          speed: fullConfig.speed,
        },
        timestamp: Date.now(),
      } as GeolocationPosition;
      
      successCallback(mockPosition);
    }, 2000);
    
    mockWatches.set(watchId, interval);
    return watchId;
  };
  
  navigator.geolocation.clearWatch = function(watchId: number) {
    const interval = mockWatches.get(watchId);
    if (interval) {
      clearInterval(interval as NodeJS.Timeout);
      mockWatches.delete(watchId);
      console.log('🎯 Mock GPS watch cleared:', watchId);
    }
  };
}

export function disableMockGPS() {
  // Clear all mock intervals
  mockWatches.forEach((interval) => clearInterval(interval as NodeJS.Timeout));
  mockWatches.clear();
  
  // Restore original watchPosition
  navigator.geolocation.watchPosition = navigator.geolocation.watchPosition;
  
  console.log('🎯 Mock GPS disabled');
}

// Make available in window for console access
(window as any).enableMockGPS = enableMockGPS;
(window as any).disableMockGPS = disableMockGPS;
