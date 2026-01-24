import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gosenderr.courier',
  appName: 'GoSenderr Senderr',
  webDir: 'dist',
  server: {
    // For development: point to local Vite server
    // Comment out for production builds
    url: 'http://localhost:5174',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Geolocation: {
      permissions: ['location', 'coarseLocation']
    }
  }
};

export default config;
