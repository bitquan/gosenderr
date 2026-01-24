import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gosenderr.customer',
  appName: 'GoSenderr Customer',
  webDir: 'dist',
  server: {
    // For development: point to local Vite server
    // Comment out for production builds
    url: 'http://localhost:5173',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
